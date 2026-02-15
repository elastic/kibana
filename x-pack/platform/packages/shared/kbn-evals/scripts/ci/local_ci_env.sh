#!/usr/bin/env bash

set -euo pipefail

die() {
  echo "$*" >&2
  # If this script is sourced, never exit the parent shell (tmux pane).
  if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    return 1
  fi
  exit 1
}

# NOTE: `source` ignores the shebang and runs in the *current* shell.
# This file uses bash features (`[[ ]]`, here-strings, etc.), so sourcing it from zsh will behave poorly
# and can terminate the session. Ensure we're running under bash.
if [[ -z "${BASH_VERSION:-}" ]]; then
  die "This script must be sourced from bash. Try: bash -lc 'source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json && env | rg \"^(LITELLM_|EVALUATION_|EVALUATIONS_ES_|TRACING_ES_|TRACING_EXPORTERS|KIBANA_TESTING_AI_CONNECTORS)\"'"
fi

CONFIG_PATH="${1:-x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  die "Missing config file: $CONFIG_PATH
Copy the example and fill it out locally:
  cp x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.example.json $CONFIG_PATH"
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

TRACING_EXPORTERS_JSON="$(jq -c '.tracingExporters // empty' <<<"$CONFIG_JSON")"

if [[ -z "$LITELLM_BASE_URL" || -z "$LITELLM_VIRTUAL_KEY" ]]; then
  die "Missing litellm.baseUrl or litellm.virtualKey in $CONFIG_PATH"
fi

if [[ -z "$EVALUATION_CONNECTOR_ID" ]]; then
  die "Missing evaluationConnectorId in $CONFIG_PATH"
fi

export LITELLM_BASE_URL
export LITELLM_VIRTUAL_KEY
export LITELLM_TEAM_NAME
export EVALUATION_CONNECTOR_ID
export EVALUATIONS_ES_URL
export EVALUATIONS_ES_API_KEY
export TRACING_ES_URL
export TRACING_ES_API_KEY
if [[ -n "$TRACING_EXPORTERS_JSON" && "$TRACING_EXPORTERS_JSON" != "null" ]]; then
  export TRACING_EXPORTERS="$TRACING_EXPORTERS_JSON"
fi

# NOTE: bash `set -e` does not reliably fail the script for errors inside `$(...)` in all contexts.
# Generate into a variable, then explicitly validate it, so we never feed empty/invalid data into JSON.parse below.
if [[ -n "${LITELLM_TEAM_ID:-}" ]]; then
  KIBANA_TESTING_AI_CONNECTORS="$(
    node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
      --base-url "$LITELLM_BASE_URL" \
      --team-id "$LITELLM_TEAM_ID" \
      --api-key "$LITELLM_VIRTUAL_KEY" \
      --model-prefix "llm-gateway/"
  )"
else
  KIBANA_TESTING_AI_CONNECTORS="$(
    node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
      --base-url "$LITELLM_BASE_URL" \
      --team-name "$LITELLM_TEAM_NAME" \
      --api-key "$LITELLM_VIRTUAL_KEY" \
      --model-prefix "llm-gateway/"
  )"
fi
export KIBANA_TESTING_AI_CONNECTORS

if [[ -z "${KIBANA_TESTING_AI_CONNECTORS:-}" ]]; then
  die "ERROR: Failed to generate KIBANA_TESTING_AI_CONNECTORS (empty output)."
fi

# Print a safe summary (no secrets)
CONNECTOR_COUNT="$(
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);console.log(Object.keys(o).length);"
)"

EVALUATION_CONNECTOR_PRESENT="$(
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);const id=process.env.EVALUATION_CONNECTOR_ID||'';process.stdout.write(String(Boolean(id && Object.prototype.hasOwnProperty.call(o,id))));"
)"

if [[ "$EVALUATION_CONNECTOR_PRESENT" != "true" ]]; then
  echo "ERROR: evaluationConnectorId ($EVALUATION_CONNECTOR_ID) is not present in generated connectors." >&2
  echo "Sample generated connector ids:" >&2
  node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);console.log(Object.keys(o).slice(0,20).join('\\n'));"
  return 1
fi

echo "Loaded kbn-evals CI env from: $CONFIG_PATH"
echo "  LITELLM_BASE_URL=$LITELLM_BASE_URL"
echo "  LITELLM_TEAM_NAME=$LITELLM_TEAM_NAME"
echo "  LITELLM_TEAM_ID=${LITELLM_TEAM_ID:+<redacted>}"
echo "  EVALUATION_CONNECTOR_ID=$EVALUATION_CONNECTOR_ID"
echo "  EVALUATIONS_ES_URL=${EVALUATIONS_ES_URL:-<empty>}"
echo "  TRACING_ES_URL=${TRACING_ES_URL:-<empty>}"
if [[ -n "${TRACING_EXPORTERS:-}" ]]; then
  echo "  TRACING_EXPORTERS=<set (JSON array)>"
else
  echo "  TRACING_EXPORTERS=<empty>"
fi
echo "  Generated connectors: $CONNECTOR_COUNT"

