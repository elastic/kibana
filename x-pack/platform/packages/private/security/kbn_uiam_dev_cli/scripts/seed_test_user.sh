#!/bin/sh

# This script seeds a test user in Cosmos DB that works with Mock IDP tokens
# Usage: ./seed_test_user.sh [cosmos_endpoint]

set -e

COSMOS_ENDPOINT="${1:-https://127.0.0.1:8081}"
DATABASE_NAME="uiam-db"
USERS_COLLECTION="users"

# Cosmos DB emulator uses a fixed key
COSMOS_KEY="C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="

# Test user details (matching Mock IDP defaults)
USER_ID="12345"
USER_EMAIL="elastic_user@elastic.co"
FIRST_NAME="Test"
LAST_NAME="User"
ORGANIZATION_ID="1234567890"
ROLE_ID="cloud-role-id"
PROJECT_TYPE="observability"
APPLICATION_ROLES='["viewer"]'

echo "*** Seeding test user in Cosmos DB ***"
echo "Endpoint: $COSMOS_ENDPOINT"
echo "Database: $DATABASE_NAME"
echo "Collection: $USERS_COLLECTION"
echo "User ID: $USER_ID"
echo ""

# Function to generate authorization token for Cosmos DB REST API
generate_auth_token() {
  verb=$1
  resource_type=$2
  resource_link=$3
  date=$4

  # Build the string to sign
  string_to_sign=$(printf "%s\n%s\n%s\n%s\n\n" "${verb}" "${resource_type}" "${resource_link}" "${date}" | tr -d '\r')

  # Generate HMAC-SHA256 signature
  signature=$(echo -n "$string_to_sign" | openssl dgst -sha256 -hmac $(echo -n "$COSMOS_KEY" | base64 -d) -binary | base64)

  # URL encode the signature
  encoded_sig=$(echo -n "$signature" | sed 's/+/%2B/g; s/\//%2F/g; s/=/%3D/g')

  echo "type%3Dmaster%26ver%3D1.0%26sig%3D${encoded_sig}"
}

# Get current timestamp in ISO 8601 format
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Create test user document matching PersistableUser structure
# Simplified to absolute minimum required fields
USER_DOC=$(cat <<EOF
{
  "id": "${USER_ID}",
  "email": "${USER_EMAIL}",
  "first_name": "${FIRST_NAME}",
  "last_name": "${LAST_NAME}",
  "organization_memberships": [
    {
      "organization_id": "${ORGANIZATION_ID}",
      "member_since": "${CURRENT_TIME}"
    }
  ],
  "role_assignments": {
    "user": [],
    "project": [
      {
        "role_id": "${ROLE_ID}",
        "organization_id": "${ORGANIZATION_ID}",
        "project_scope": {
          "scope": "all"
        },
        "project_type": "${PROJECT_TYPE}",
        "application_roles": ${APPLICATION_ROLES}
      }
    ],
    "deployment": [],
    "platform": [],
    "organization": [],
    "cloudConnected": []
  },
  "enabled": true,
  "metadata": {
    "created": "${CURRENT_TIME}",
    "last_modified": "${CURRENT_TIME}"
  }
}
EOF
)

echo "User document to be created:"
echo "$USER_DOC" | head -20
echo ""

echo "Creating test user: ${USER_ID}"
DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")
RESOURCE_LINK="dbs/${DATABASE_NAME}/colls/${USERS_COLLECTION}"
AUTH_TOKEN=$(generate_auth_token "POST" "docs" "${RESOURCE_LINK}" "$DATE")

HTTP_CODE=$(curl -sk -w "%{http_code}" -o /tmp/cosmos_user_response.json -X POST \
  "${COSMOS_ENDPOINT}/dbs/${DATABASE_NAME}/colls/${USERS_COLLECTION}/docs" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "x-ms-date: ${DATE}" \
  -H "x-ms-version: 2018-12-31" \
  -H "x-ms-documentdb-partitionkey: [\"${USER_ID}\"]" \
  -H "Content-Type: application/json" \
  -d "${USER_DOC}")

if [ "$HTTP_CODE" -eq 201 ]; then
  echo "✓ Test user created successfully"
  echo ""
  echo "Response:"
  cat /tmp/cosmos_user_response.json | head -20
  echo ""
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "✓ Test user already exists"
else
  echo "✗ Failed to create test user (HTTP $HTTP_CODE)"
  cat /tmp/cosmos_user_response.json
  echo ""
  exit 1
fi

echo ""
echo "*** Test user seeded successfully ***"
echo ""
echo "User credentials for testing:"
echo "  User ID: ${USER_ID}"
echo "  Email: ${USER_EMAIL}"
echo "  Name: ${FIRST_NAME} ${LAST_NAME}"
echo "  Organization ID: ${ORGANIZATION_ID}"
echo "  Roles: admin"
echo ""
echo "You can now authenticate with Mock IDP using this user."
