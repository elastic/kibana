#!/usr/bin/env bash
set -euo pipefail

# Activates a data source in Kibana by POSTing to the Data Sources API.
# Reads credentials from a file, deletes the file immediately, then makes the API call.
# This ensures credentials never appear in the calling process's output.

TYPE=""
NAME=""
CREDENTIALS_FILE=""

usage() {
  echo "Usage: $0 --type <data-source-type> --name <display-name> --credentials-file <path> [--kibana-url <url>]"
  echo ""
  echo "Options:"
  echo "  --type              Data source type ID (e.g., 'github', 'notion')"
  echo "  --name              Display name for the data source"
  echo "  --credentials-file  Path to a file containing the credential string"
  echo "                      (bearer token, API key, or user:password)"
  echo "                      The file is deleted immediately after reading."
  echo "  --kibana-url        Kibana base URL (overrides auto-detection)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --credentials-file) CREDENTIALS_FILE="$2"; shift 2 ;;
    --kibana-url) export KIBANA_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$TYPE" || -z "$NAME" || -z "$CREDENTIALS_FILE" ]]; then
  echo "Error: --type, --name, and --credentials-file are all required."
  usage
fi

if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "Error: Credentials file not found: $CREDENTIALS_FILE"
  exit 1
fi

# Source common.sh for Kibana auto-detection (after parsing --kibana-url)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Read credentials and immediately delete the file
CREDENTIALS="$(cat "$CREDENTIALS_FILE")"
rm -f "$CREDENTIALS_FILE"

# Trim whitespace/newlines from credentials
CREDENTIALS="$(echo -n "$CREDENTIALS" | tr -d '\n\r')"

if [[ -z "$CREDENTIALS" ]]; then
  echo "Error: Credentials file was empty."
  exit 1
fi

# Build JSON payload (using jq if available, otherwise manual escaping)
if command -v jq &>/dev/null; then
  PAYLOAD="$(jq -n \
    --arg type "$TYPE" \
    --arg name "$NAME" \
    --arg creds "$CREDENTIALS" \
    '{type: $type, name: $name, credentials: $creds}')"
else
  # Manual JSON construction - escape double quotes in values
  ESC_TYPE="${TYPE//\"/\\\"}"
  ESC_NAME="${NAME//\"/\\\"}"
  ESC_CREDS="${CREDENTIALS//\"/\\\"}"
  PAYLOAD="{\"type\":\"${ESC_TYPE}\",\"name\":\"${ESC_NAME}\",\"credentials\":\"${ESC_CREDS}\"}"
fi

# Clear the credentials variable
CREDENTIALS=""

# Make the API call
RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  "$KIBANA_URL/api/data_sources" \
  -d "$PAYLOAD")"

# Clear the payload
PAYLOAD=""

# Extract HTTP status code (last line) and body (everything else)
HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "Data source created successfully!"
  echo "$BODY"
else
  echo "Error creating data source (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
