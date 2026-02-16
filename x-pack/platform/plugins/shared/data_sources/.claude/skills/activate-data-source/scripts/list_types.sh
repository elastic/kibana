#!/usr/bin/env bash
set -euo pipefail

# Lists all registered data source types from Kibana's Data Catalog API.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/data_sources_registry/types")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    echo "Available data source types:"
    echo ""
    echo "$BODY" | jq -r '.[] | "  \(.id)\t\(.name)\t\(.stackConnector.type)\t\(.stackConnector.config.authType // "see connector spec")\t\(.description // "")"' | column -t -s $'\t'
    echo ""
    echo "Columns: ID, Name, Connector Type, Auth Type, Description"
  else
    echo "Available data source types (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching data source types (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
