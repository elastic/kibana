#!/usr/bin/env bash
set -euo pipefail

# Lists all available Agent Builder tools, grouped by source.

REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/agent_builder/tools")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    DS_TOOLS="$(echo "$BODY" | jq -r '[.results[] | select(.tags | index("data-source"))]')"
    DS_COUNT="$(echo "$DS_TOOLS" | jq 'length')"
    PLATFORM_TOOLS="$(echo "$BODY" | jq -r '[.results[] | select(.tags | index("data-source") | not)]')"
    PLATFORM_COUNT="$(echo "$PLATFORM_TOOLS" | jq 'length')"

    echo "Platform tools ($PLATFORM_COUNT):"
    echo ""
    echo "$PLATFORM_TOOLS" | jq -r '.[] | "  \(.id)"'

    echo ""
    echo "Data source tools ($DS_COUNT):"
    echo ""
    echo "$DS_TOOLS" | jq -r '.[] | "  \(.id)\t[\(.tags | join(", "))]"' | column -t -s $'\t'
  else
    echo "Available tools (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching tools (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
