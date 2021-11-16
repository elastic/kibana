## Certificate generation

The Elasticsearch HTTP layer keystore is supposed to mimic the PKCS12 keystore that the elasticsearch startup script will auto-generate for a node. The keystore contains:

- A PrivateKeyEntry for the node's key and certificate for the HTTP layer
- A PrivateKeyEntry for the CA's key and certificate
- A TrustedCertificateEntry for the CA's certificate

__IMPORTANT:__ CA keystore (ca.p12) is not checked in intentionally, talk to @elastic/kibana-security if you need it to sign new certificates.

```bash
CA_PATH='packages/kbn-dev-utils/certs/ca.p12'
CA1='root-ca'
CA2='intermediate-ca'
EE1='elasticsearch'

bin/elasticsearch-certutil ca --ca-dn "CN=Elastic Intermediate CA" -days 18250 --out $CA2.p12 --pass castorepass
bin/elasticsearch-certutil cert \
  --ca $CA2.p12 --ca-pass castorepass --name $EE1 \
  --dns=localhost --dns=localhost.localdomain \
  --dns=localhost4 --dns=localhost4.localdomain4 \
  --dns=localhost6 --dns=localhost6.localdomain6 \
  --ip=127.0.0.1 --ip=0:0:0:0:0:0:0:1 \
  -days 18250 --out $EE1.p12 --pass storepass

# Convert P12 keystores to PEM files
openssl pkcs12 -in $CA_PATH -out $CA1.crt -nokeys -passin pass:castorepass -passout pass:
openssl pkcs12 -in $CA_PATH -nocerts -passin pass:castorepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $CA1.key

openssl pkcs12 -in $CA2.p12 -out $CA2.crt -nokeys -passin pass:castorepass -passout pass:
openssl pkcs12 -in $CA2.p12 -nocerts -passin pass:castorepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $CA2.key

openssl pkcs12 -in $EE1.p12 -out $EE1.crt -clcerts -passin pass:storepass -passout pass:
openssl pkcs12 -in $EE1.p12 -nocerts -passin pass:storepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $EE1.key

# Re-sign intermediate CA cert
mkdir -p ./tmp
openssl x509 -x509toreq -in $CA2.crt -signkey $CA2.key -out ./tmp/$CA2.csr
dd if=/dev/urandom of=./tmp/rand bs=256 count=1
touch ./tmp/index.txt
echo "01" > ./tmp/serial
cp /System/Library/OpenSSL/openssl.cnf ./tmp/
echo "
[ tmpcnf ]
dir             = ./
certs           = ./
new_certs_dir   = ./tmp
crl_dir         = ./tmp/crl
database        = ./tmp/index.txt
unique_subject  = no
certificate     = ./$CA1.crt
serial          = ./tmp/serial
crlnumber       = ./tmp/crlnumber
crl             = ./tmp/crl.pem
private_key     = ./$CA1.key
RANDFILE        = ./tmp/rand
x509_extensions = v3_ca
name_opt        = ca_default
cert_opt        = ca_default
default_days    = 18250
default_crl_days= 30
default_md      = sha256
preserve        = no
policy          = policy_anything
" >> ./tmp/openssl.cnf

openssl ca -batch -config ./tmp/openssl.cnf -name tmpcnf -in ./tmp/$CA2.csr -out $CA2.crt

# Convert PEM files back to P12 keystores
cat $CA2.key $CA2.crt $CA1.crt | openssl pkcs12 -export -name $CA2 -passout pass:castorepass -out $CA2.p12
cat $EE1.key $EE1.crt $CA1.crt $CA2.crt | openssl pkcs12 -export -name $EE1 -passout pass:storepass -out $EE1.p12

# Verify contents of keystores
openssl pkcs12 -info -in $CA2.p12 -passin pass:"castorepass" -nodes
openssl pkcs12 -info -in $EE1.p12 -passin pass:"storepass" -nodes

```
