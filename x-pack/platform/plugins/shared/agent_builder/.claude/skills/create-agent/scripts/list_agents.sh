#!/usr/bin/env bash
set -euo pipefail

# Lists all existing Agent Builder agents.

REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/agent_builder/agents")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    COUNT="$(echo "$BODY" | jq '.results | length')"
    echo "Existing agents ($COUNT):"
    echo ""
    if [[ "$COUNT" -gt 0 ]]; then
      echo "$BODY" | jq -r '.results[] | "  \(.id)\t\(.name)\t\(.configuration.tools[0].tool_ids | length) tools\t\(if .readonly then "readonly" else "editable" end)"' | column -t -s $'\t'
    else
      echo "  (none)"
    fi
  else
    echo "Existing agents (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching agents (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
