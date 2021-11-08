## Certificate generation

The Elasticsearch HTTP layer keystore is supposed to mimic the PKCS12 keystore that the elasticsearch startup script will auto-generate for a node. The keystore contains:

- A PrivateKeyEntry for the node's key and certificate for the HTTP layer
- A PrivateKeyEntry for the CA's key and certificate
- A TrustedCertificateEntry for the CA's certificate

```bash
$ES_HOME/bin/elasticsearch-certutil cert \
  --out $KIBANA_HOME/test/interactive_setup_api_integration/fixtures/elasticsearch.p12 \
  --ca $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 --ca-pass "castorepass" --pass "storepass" \
  --dns=localhost --dns=localhost.localdomain --dns=localhost4 --dns=localhost4.localdomain4 \
  --dns=localhost6 --dns=localhost6.localdomain6 \
  --ip=127.0.0.1 --ip=0:0:0:0:0:0:0:1
```

Change the alias of the TrustedCertificateEntry so that it won't clash with the CA PrivateKeyEntry
```bash
keytool -changealias -alias ca -destalias cacert -keystore \
  $KIBANA_HOME/test/interactive_setup_api_integration/fixtures/elasticsearch.p12 \
  -deststorepass "storepass"
```

Import the CA PrivateKeyEntry
```bash
keytool -importkeystore \
  -srckeystore $KIBANA_HOME/packages/kbn-dev-utils/certs/ca.p12 \
  -srcstorepass "castorepass" \
  -destkeystore $KIBANA_HOME/test/interactive_setup_api_integration/fixtures/elasticsearch.p12 \
  -deststorepass "storepass"
```
