#!/usr/bin/env bash
set -euo pipefail

# Sends a message to an Agent Builder agent via the async chat API
# and prints formatted SSE events (reasoning, tool calls, response).

AGENT_ID=""
PROMPT=""

usage() {
  echo "Usage: $0 --agent-id <id> --prompt <message> [--kibana-url <url>]"
  echo ""
  echo "Required:"
  echo "  --agent-id    Agent ID to chat with"
  echo "  --prompt      Message to send to the agent"
  echo ""
  echo "Optional:"
  echo "  --kibana-url  Kibana base URL (overrides auto-detection)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-id) AGENT_ID="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --kibana-url) export KIBANA_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$AGENT_ID" || -z "$PROMPT" ]]; then
  echo "Error: --agent-id and --prompt are required."
  usage
fi

# Source shared Kibana API utilities
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

# Build request payload
if command -v jq &>/dev/null; then
  PAYLOAD="$(jq -n \
    --arg input "$PROMPT" \
    --arg agent_id "$AGENT_ID" \
    '{ input: $input, agent_id: $agent_id }')"
else
  ESC_PROMPT="${PROMPT//\"/\\\"}"
  ESC_ID="${AGENT_ID//\"/\\\"}"
  PAYLOAD="{\"input\":\"${ESC_PROMPT}\",\"agent_id\":\"${ESC_ID}\"}"
fi

echo "Chatting with agent '$AGENT_ID'..."
echo "Prompt: $PROMPT"
echo ""

# Stream SSE events from the async chat endpoint.
# The SSE response format is:
#   event: <type>
#   data: {"data": { ... actual payload ... }}
#
# Note: All event payloads are wrapped in an extra {"data": ...} envelope.
# Keep-alive comments (lines starting with ":") are interspersed.
EVENT_TYPE=""

kibana_curl --no-buffer -N \
  -X POST \
  -H "Content-Type: application/json" \
  "$KIBANA_URL/api/agent_builder/converse/async" \
  -d "$PAYLOAD" 2>/dev/null | while IFS= read -r line; do

  # Strip carriage returns (SSE may use \r\n)
  line="${line//$'\r'/}"

  # Skip SSE comments (keep-alive padding)
  if [[ "$line" == :* ]]; then
    continue
  fi

  if [[ "$line" == event:* ]]; then
    EVENT_TYPE="${line#event: }"
    continue
  fi

  if [[ "$line" == data:* ]]; then
    DATA="${line#data: }"

    case "$EVENT_TYPE" in
      reasoning)
        if command -v jq &>/dev/null; then
          REASONING="$(echo "$DATA" | jq -r '.data.reasoning // empty')"
        else
          REASONING="$DATA"
        fi
        if [[ -n "$REASONING" ]]; then
          echo "[Reasoning] $REASONING"
        fi
        ;;

      tool_call)
        if command -v jq &>/dev/null; then
          TOOL_ID="$(echo "$DATA" | jq -r '.data.tool_id // empty')"
          PARAMS="$(echo "$DATA" | jq -c '.data.params // {}')"
        else
          TOOL_ID="(see raw data)"
          PARAMS="$DATA"
        fi
        echo "[Tool Call] $TOOL_ID $PARAMS"
        ;;

      tool_result)
        if command -v jq &>/dev/null; then
          TOOL_ID="$(echo "$DATA" | jq -r '.data.tool_id // empty')"
          # Truncate results to keep output manageable
          RESULT_SUMMARY="$(echo "$DATA" | jq -c '.data.results // []' | head -c 500)"
          if [[ ${#RESULT_SUMMARY} -ge 500 ]]; then
            RESULT_SUMMARY="${RESULT_SUMMARY}... (truncated)"
          fi
        else
          TOOL_ID="(see raw data)"
          RESULT_SUMMARY="$(echo "$DATA" | head -c 500)"
        fi
        echo "[Tool Result] $TOOL_ID -> $RESULT_SUMMARY"
        ;;

      tool_progress)
        if command -v jq &>/dev/null; then
          MSG="$(echo "$DATA" | jq -r '.data.message // empty')"
        else
          MSG="$DATA"
        fi
        if [[ -n "$MSG" ]]; then
          echo "[Tool Progress] $MSG"
        fi
        ;;

      thinking_complete)
        echo ""
        echo "[Thinking Complete]"
        echo ""
        ;;

      message_complete)
        if command -v jq &>/dev/null; then
          MSG_CONTENT="$(echo "$DATA" | jq -r '.data.message_content // empty')"
        else
          MSG_CONTENT="$DATA"
        fi
        echo "[Response]"
        echo "$MSG_CONTENT"
        ;;

      round_complete)
        echo ""
        echo "[Round Complete]"
        if command -v jq &>/dev/null; then
          STATUS="$(echo "$DATA" | jq -r '.data.round.status // "unknown"')"
          echo "Status: $STATUS"
        fi
        ;;

      conversation_id_set)
        if command -v jq &>/dev/null; then
          CONV_ID="$(echo "$DATA" | jq -r '.data.conversation_id // empty')"
        else
          CONV_ID="$DATA"
        fi
        echo "[Conversation] $CONV_ID"
        echo ""
        ;;

      # Skip message_chunk (we use message_complete), conversation_created/updated, etc.
      *)
        ;;
    esac

    EVENT_TYPE=""
    continue
  fi
done

EXIT_CODE=${PIPESTATUS[0]:-0}
if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo "Error: Chat request failed (curl exit code $EXIT_CODE)" >&2
  exit 1
fi
