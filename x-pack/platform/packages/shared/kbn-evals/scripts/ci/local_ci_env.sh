#!/usr/bin/env bash

set -euo pipefail

CONFIG_PATH="${1:-x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Missing config file: $CONFIG_PATH"
  echo "Copy the example and fill it out locally:"
  echo "  cp x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.example.json $CONFIG_PATH"
  exit 1
fi

CONFIG_JSON="$(cat "$CONFIG_PATH")"

# Validate config shape (safe; does not print secrets)
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/validate_config.js --config "$CONFIG_PATH" >/dev/null

LITELLM_BASE_URL="$(jq -r '.litellm.baseUrl // empty' <<<"$CONFIG_JSON")"
LITELLM_VIRTUAL_KEY="$(jq -r '.litellm.virtualKey // empty' <<<"$CONFIG_JSON")"
LITELLM_TEAM_ID="$(jq -r '.litellm.teamId // empty' <<<"$CONFIG_JSON")"
LITELLM_TEAM_NAME="$(jq -r '.litellm.teamName // "kibana-ci-evals"' <<<"$CONFIG_JSON")"

EVALUATION_CONNECTOR_ID="$(jq -r '.evaluationConnectorId // empty' <<<"$CONFIG_JSON")"

EVALUATIONS_ES_URL="$(jq -r '.evaluationsEs.url // empty' <<<"$CONFIG_JSON")"
EVALUATIONS_ES_API_KEY="$(jq -r '.evaluationsEs.apiKey // empty' <<<"$CONFIG_JSON")"

TRACING_ES_URL="$(jq -r '.tracingEs.url // empty' <<<"$CONFIG_JSON")"
TRACING_ES_API_KEY="$(jq -r '.tracingEs.apiKey // empty' <<<"$CONFIG_JSON")"

if [[ -z "$LITELLM_BASE_URL" || -z "$LITELLM_VIRTUAL_KEY" ]]; then
  echo "Missing litellm.baseUrl or litellm.virtualKey in $CONFIG_PATH"
  exit 1
fi

if [[ -z "$EVALUATION_CONNECTOR_ID" ]]; then
  echo "Missing evaluationConnectorId in $CONFIG_PATH"
  exit 1
fi

export LITELLM_BASE_URL
export LITELLM_VIRTUAL_KEY
export LITELLM_TEAM_NAME
export EVALUATION_CONNECTOR_ID
export EVALUATIONS_ES_URL
export EVALUATIONS_ES_API_KEY
export TRACING_ES_URL
export TRACING_ES_API_KEY

export KIBANA_TESTING_AI_CONNECTORS="$(
  if [[ -n "${LITELLM_TEAM_ID:-}" ]]; then
    node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
      --base-url "$LITELLM_BASE_URL" \
      --team-id "$LITELLM_TEAM_ID" \
      --api-key "$LITELLM_VIRTUAL_KEY" \
      --model-prefix "llm-gateway/"
  else
    node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
      --base-url "$LITELLM_BASE_URL" \
      --team-name "$LITELLM_TEAM_NAME" \
      --api-key "$LITELLM_VIRTUAL_KEY" \
      --model-prefix "llm-gateway/"
  fi
)"

# Print a safe summary (no secrets)
CONNECTOR_COUNT="$(
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);console.log(Object.keys(o).length);"
)"

EVALUATION_CONNECTOR_PRESENT="$(
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);const id=process.env.EVALUATION_CONNECTOR_ID||'';process.stdout.write(String(Boolean(id && Object.prototype.hasOwnProperty.call(o,id))));"
)"

if [[ "$EVALUATION_CONNECTOR_PRESENT" != "true" ]]; then
  echo "ERROR: evaluationConnectorId ($EVALUATION_CONNECTOR_ID) is not present in generated connectors."
  echo "Sample generated connector ids:"
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);console.log(Object.keys(o).slice(0,20).join('\\n'));"
  exit 1
fi

echo "Loaded kbn-evals CI env from: $CONFIG_PATH"
echo "  LITELLM_BASE_URL=$LITELLM_BASE_URL"
echo "  LITELLM_TEAM_NAME=$LITELLM_TEAM_NAME"
echo "  LITELLM_TEAM_ID=${LITELLM_TEAM_ID:+<redacted>}"
echo "  EVALUATION_CONNECTOR_ID=$EVALUATION_CONNECTOR_ID"
echo "  EVALUATIONS_ES_URL=${EVALUATIONS_ES_URL:-<empty>}"
echo "  TRACING_ES_URL=${TRACING_ES_URL:-<empty>}"
echo "  Generated connectors: $CONNECTOR_COUNT"

