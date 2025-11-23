import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";

// tipos para bater com a resposta do backend
type InvoiceItem = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

type Invoice = {
  loja: string;
  cnpj: string;
  data_emissao: string;
  total: number;
  itens: InvoiceItem[];
};

export default function App() {
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [rawUrl, setRawUrl] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TROQUE PARA SUA URL NA VERCEL
  const BACKEND_URL = "https://finance-manager-python-server.vercel.app/consulta-nfce";

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setIsScanning(false);
    setRawUrl(result.data); // só pra debug / info
    console.log("QR LIDO:", result.data);
    fetchNFCe(result.data);
  };

  const fetchNFCe = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      setInvoice(null);

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro backend:", text);
        setError("Não foi possível processar a nota. Tente novamente.");
        return;
      }

      const data: Invoice = await res.json();
      console.log("Invoice:", data);
      setInvoice(data);
    } catch (err) {
      console.error("Erro fetch:", err);
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Pedindo permissão da câmera...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>
          Sem acesso à câmera. Habilite nas configurações.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Finance Manager</Text>
      <Text style={styles.subtitle}>
        Escaneie o QRCode da sua Nota Fiscal
      </Text>

      {/* Botão para abrir/fechar o scanner */}
      <View style={styles.actions}>
        {isScanning ? (
          <Button title="Cancelar leitura" onPress={() => setIsScanning(false)} />
        ) : (
          <Button title="Escanear Nota" onPress={() => setIsScanning(true)} />
        )}
      </View>

      {/* Scanner */}
      {isScanning && (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.scanner}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        </View>
      )}

      {/* Loader / erro */}
      {loading && (
        <View style={styles.statusBox}>
          <ActivityIndicator />
          <Text style={styles.statusText}>Processando nota...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.statusBoxError}>
          <Text style={styles.statusTextError}>{error}</Text>
        </View>
      )}

      {/* Resultado bonito */}
      {!loading && !error && invoice && (
        <ScrollView style={styles.resultScroll}>
          {/* Card da nota */}
          <View style={styles.invoiceCard}>
            <Text style={styles.storeName}>{invoice.loja}</Text>
            <Text style={styles.storeDetail}>CNPJ: {invoice.cnpj}</Text>
            {invoice.data_emissao ? (
              <Text style={styles.storeDetail}>
                Emissão: {invoice.data_emissao}
              </Text>
            ) : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total da compra</Text>
              <Text style={styles.totalValue}>
                R$ {invoice.total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Lista de itens */}
          <Text style={styles.itemsTitle}>Itens da Nota</Text>
          {invoice.itens.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDescription}>{item.descricao}</Text>
                <Text style={styles.itemSubText}>
                  Qtd: {item.quantidade} • Vl. unit: R${" "}
                  {item.valor_unitario.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                R$ {item.valor_total.toFixed(2)}
              </Text>
            </View>
          ))}

          {rawUrl && (
            <View style={styles.rawUrlBox}>
              <Text style={styles.rawUrlLabel}>QR lido (URL NFC-e):</Text>
              <Text selectable style={styles.rawUrlText}>
                {rawUrl}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Estado inicial: nenhuma nota ainda */}
      {!loading && !error && !invoice && !isScanning && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Nenhuma nota escaneada ainda. Toque em{" "}
            <Text style={{ fontWeight: "700" }}>“Escanear Nota”</Text> para
            começar.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    color: "#555",
  },
  actions: {
    marginTop: 8,
    alignItems: "center",
  },
  scannerContainer: {
    height: 260,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#000",
  },
  scanner: {
    flex: 1,
  },
  statusBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#e0ecff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    marginLeft: 8,
    color: "#215093",
  },
  statusBoxError: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffe0e0",
  },
  statusTextError: {
    color: "#b00020",
  },
  resultScroll: {
    marginTop: 16,
    marginBottom: 24,
  },
  invoiceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  storeDetail: {
    fontSize: 13,
    color: "#555",
  },
  totalRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: "#444",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0c8a3f",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemSubText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
    color: "#333",
  },
  rawUrlBox: {
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  rawUrlLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    color: "#666",
  },
  rawUrlText: {
    fontSize: 11,
    color: "#333",
  },
  emptyBox: {
    marginTop: 24,
    padding: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
});
