#!/usr/bin/env bash
set -euo pipefail

# Creates an Agent Builder agent via the Kibana API.

NAME=""
DESCRIPTION=""
INSTRUCTIONS=""
TOOL_IDS=""
COLOR=""
SYMBOL=""

usage() {
  echo "Usage: $0 --name <name> --tool-ids <id1,id2,...> [options]"
  echo ""
  echo "Required:"
  echo "  --name          Agent display name"
  echo "  --tool-ids      Comma-separated list of tool IDs"
  echo ""
  echo "Optional:"
  echo "  --description   Agent description (defaults to name)"
  echo "  --instructions  System instructions for the agent"
  echo "  --color         Avatar hex color (e.g., '#8ebc9e')"
  echo "  --symbol        Avatar symbol, 2 chars (defaults to first 2 of name)"
  echo "  --kibana-url    Kibana base URL (overrides auto-detection)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    --instructions) INSTRUCTIONS="$2"; shift 2 ;;
    --tool-ids) TOOL_IDS="$2"; shift 2 ;;
    --color) COLOR="$2"; shift 2 ;;
    --symbol) SYMBOL="$2"; shift 2 ;;
    --kibana-url) export KIBANA_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$NAME" || -z "$TOOL_IDS" ]]; then
  echo "Error: --name and --tool-ids are required."
  usage
fi

# Defaults
DESCRIPTION="${DESCRIPTION:-$NAME}"
SYMBOL="${SYMBOL:-${NAME:0:2}}"

# Generate an ID from the name: lowercase, replace spaces/underscores with hyphens, strip non-alphanumeric
AGENT_ID="$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | tr -cd 'a-z0-9-')"

# Source shared Kibana API utilities (after parsing --kibana-url)
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

# Build the tool_ids JSON array from comma-separated string
if command -v jq &>/dev/null; then
  TOOL_IDS_JSON="$(echo "$TOOL_IDS" | tr ',' '\n' | jq -R . | jq -s .)"

  PAYLOAD="$(jq -n \
    --arg id "$AGENT_ID" \
    --arg name "$NAME" \
    --arg desc "$DESCRIPTION" \
    --arg instr "$INSTRUCTIONS" \
    --arg color "$COLOR" \
    --arg symbol "$SYMBOL" \
    --argjson tool_ids "$TOOL_IDS_JSON" \
    '{
      id: $id,
      name: $name,
      description: $desc,
      configuration: {
        instructions: $instr,
        tools: [{ tool_ids: $tool_ids }]
      }
    } + (if $color != "" then { avatar_color: $color } else {} end)
      + (if $symbol != "" then { avatar_symbol: $symbol } else {} end)')"
else
  # Manual JSON construction
  IFS=',' read -ra IDS <<< "$TOOL_IDS"
  TOOL_IDS_JSON=""
  for id in "${IDS[@]}"; do
    id="$(echo -n "$id" | xargs)"  # trim whitespace
    if [[ -n "$TOOL_IDS_JSON" ]]; then
      TOOL_IDS_JSON="$TOOL_IDS_JSON,"
    fi
    TOOL_IDS_JSON="$TOOL_IDS_JSON\"$id\""
  done

  ESC_NAME="${NAME//\"/\\\"}"
  ESC_DESC="${DESCRIPTION//\"/\\\"}"
  ESC_INSTR="${INSTRUCTIONS//\"/\\\"}"
  ESC_SYMBOL="${SYMBOL//\"/\\\"}"

  PAYLOAD="{\"id\":\"${AGENT_ID}\",\"name\":\"${ESC_NAME}\",\"description\":\"${ESC_DESC}\""
  if [[ -n "$COLOR" ]]; then
    PAYLOAD="$PAYLOAD,\"avatar_color\":\"$COLOR\""
  fi
  if [[ -n "$SYMBOL" ]]; then
    PAYLOAD="$PAYLOAD,\"avatar_symbol\":\"${ESC_SYMBOL}\""
  fi
  PAYLOAD="$PAYLOAD,\"configuration\":{\"instructions\":\"${ESC_INSTR}\",\"tools\":[{\"tool_ids\":[$TOOL_IDS_JSON]}]}}"
fi

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  "$KIBANA_URL/api/agent_builder/agents" \
  -d "$PAYLOAD")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "Agent created successfully!"
  echo "$BODY"
else
  echo "Error creating agent (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
