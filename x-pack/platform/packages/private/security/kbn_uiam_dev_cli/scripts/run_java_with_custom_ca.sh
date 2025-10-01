#!/bin/bash

COSMOS_DB_CA_PATH=/tmp/cosmosdb-root-ca.crt
COMBINED_CA_BUNDLE_PATH=/opt/jboss/container/java/combined-cacerts

echo "*** Fetching CosmosDB emulator CA certificate from $(printenv 'uiam.cosmos.account.endpoint') ***"

# Use Java to fetch the CA certificate from the CosmosDB endpoint.
cat > /tmp/FetchCert.java <<'EOF'
import javax.net.ssl.*;
import java.io.*;
import java.net.URI;
import java.security.cert.X509Certificate;

public class FetchCert {
    public static void main(String[] args) throws Exception {
        URI url = new URI(args[0]);
        String host = url.getHost();
        int port = url.getPort() != -1 ? url.getPort() : 443;
        String outFile = args[1];

        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, new TrustManager[] { new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] c, String a) {}
            public void checkServerTrusted(X509Certificate[] c, String a) {}
            public X509Certificate[] getAcceptedIssuers() { return null; }
        } }, null);

        SSLSocketFactory factory = context.getSocketFactory();
        try (SSLSocket socket = (SSLSocket) factory.createSocket(host, port)) {
            socket.startHandshake();
            X509Certificate cert = (X509Certificate) socket.getSession().getPeerCertificates()[0];
            try (Writer w = new FileWriter(outFile)) {
                w.write("-----BEGIN CERTIFICATE-----\n");
                w.write(java.util.Base64.getMimeEncoder(64, "\n".getBytes())
                        .encodeToString(cert.getEncoded()));
                w.write("\n-----END CERTIFICATE-----\n");
            }
        }
    }
}
EOF

javac -Xlint:deprecation /tmp/FetchCert.java
java -cp /tmp FetchCert "$(printenv 'uiam.cosmos.account.endpoint')" "$COSMOS_DB_CA_PATH"

echo "*** Importing CosmosDB emulator CA certificate into JVM cacerts ***"
cp "$JAVA_HOME/lib/security/cacerts" $COMBINED_CA_BUNDLE_PATH
chmod 777 $COMBINED_CA_BUNDLE_PATH

keytool -importcert -alias cosmosdb-root \
        -file $COSMOS_DB_CA_PATH \
        -keystore $COMBINED_CA_BUNDLE_PATH \
        -storepass changeit -noprompt -trustcacerts

export JAVA_TOOL_OPTIONS="\
  -Djavax.net.ssl.trustStore=$COMBINED_CA_BUNDLE_PATH \
  -Djavax.net.ssl.trustStorePassword=changeit \
  -Djavax.net.ssl.trustStoreType=JKS \
  -Djavax.net.debug=ssl"

exec /opt/jboss/container/java/run/run-java.sh
