#!/usr/bin/env bash
set -euo pipefail

# Lists all active (created) data source instances from Kibana's Data Sources API.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/data_sources")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    TOTAL="$(echo "$BODY" | jq -r '.total')"
    echo "Active data sources ($TOTAL total):"
    echo ""
    if [[ "$TOTAL" -gt 0 ]]; then
      echo "$BODY" | jq -r '.dataSources[] | "  \(.id)\t\(.name)\t\(.type)"' | column -t -s $'\t'
    else
      echo "  (none)"
    fi
  else
    echo "Active data sources (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching data sources (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
