#!/bin/sh

# This script initializes the Cosmos DB emulator with the required database and collections for UIAM
# It uses the Cosmos DB REST API to create the database and collections

set -e

COSMOS_ENDPOINT="${1:-https://127.0.0.1:8081}"
DATABASE_NAME="uiam-db"
# Use space-separated string instead of bash array
COLLECTIONS="api-keys token-invalidation users"

# Cosmos DB emulator uses a fixed key
COSMOS_KEY="C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="

echo "*** Initializing Cosmos DB emulator ***"
echo "Endpoint: $COSMOS_ENDPOINT"
echo "Database: $DATABASE_NAME"

# Wait for Cosmos DB to be ready
echo "Waiting for Cosmos DB to be ready..."
i=1
while [ $i -le 60 ]; do
  if curl -sk "${COSMOS_ENDPOINT}/_explorer/healthcheck" > /dev/null 2>&1; then
    echo "Cosmos DB is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "ERROR: Cosmos DB did not become ready in time"
    exit 1
  fi
  echo "Waiting... (attempt $i/60)"
  sleep 2
  i=$((i + 1))
done

# Additional delay to ensure Cosmos DB is fully initialized
sleep 5

# Function to generate authorization token for Cosmos DB REST API
generate_auth_token() {
  verb=$1
  resource_type=$2
  resource_id=$3
  date=$4

  # Build the string to sign
  string_to_sign=$(printf "%s\n%s\n%s\n%s\n\n" "${verb}" "${resource_type}" "${resource_id}" "${date}" | tr -d '\r')

  # Generate HMAC-SHA256 signature
  signature=$(echo -n "$string_to_sign" | openssl dgst -sha256 -hmac $(echo -n "$COSMOS_KEY" | base64 -d) -binary | base64)

  # URL encode the signature (manual encoding for special characters)
  encoded_sig=$(echo -n "$signature" | sed 's/+/%2B/g; s/\//%2F/g; s/=/%3D/g')

  echo "type%3Dmaster%26ver%3D1.0%26sig%3D${encoded_sig}"
}

# Create database
echo "Creating database: $DATABASE_NAME"
DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")
AUTH_TOKEN=$(generate_auth_token "POST" "dbs" "" "$DATE")

HTTP_CODE=$(curl -sk -w "%{http_code}" -o /tmp/cosmos_response.json -X POST \
  "${COSMOS_ENDPOINT}/dbs" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "x-ms-date: ${DATE}" \
  -H "x-ms-version: 2018-12-31" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${DATABASE_NAME}\"}")

if [ "$HTTP_CODE" -eq 201 ]; then
  echo "✓ Database created successfully"
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "✓ Database already exists"
else
  echo "✗ Failed to create database (HTTP $HTTP_CODE)"
  cat /tmp/cosmos_response.json
  echo ""
fi

# Create collections with partition key
for COLLECTION in $COLLECTIONS; do
  echo "Creating collection: $COLLECTION"
  DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")
  AUTH_TOKEN=$(generate_auth_token "POST" "colls" "dbs/${DATABASE_NAME}" "$DATE")

  HTTP_CODE=$(curl -sk -w "%{http_code}" -o /tmp/cosmos_response.json -X POST \
    "${COSMOS_ENDPOINT}/dbs/${DATABASE_NAME}/colls" \
    -H "Authorization: ${AUTH_TOKEN}" \
    -H "x-ms-date: ${DATE}" \
    -H "x-ms-version: 2018-12-31" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"${COLLECTION}\",\"partitionKey\":{\"paths\":[\"/id\"],\"kind\":\"Hash\"}}")

  if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✓ Collection created successfully"
  elif [ "$HTTP_CODE" -eq 409 ]; then
    echo "✓ Collection already exists"
  else
    echo "✗ Failed to create collection (HTTP $HTTP_CODE)"
    cat /tmp/cosmos_response.json
    echo ""
  fi
done

echo ""
echo "*** Cosmos DB initialization complete ***"
echo "Database: $DATABASE_NAME"
echo "Collections: $COLLECTIONS"
