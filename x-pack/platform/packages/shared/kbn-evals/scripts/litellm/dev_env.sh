#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${LITELLM_BASE_URL:-https://elastic.litellm-prod.ai}"
TEAM_NAME="${LITELLM_TEAM_NAME:-kibana-devs}"
MODEL_PREFIX="${LITELLM_MODEL_PREFIX:-llm-gateway/}"

# Best-effort email discovery (used as key alias)
EMAIL="${LITELLM_KEY_ALIAS:-${GIT_AUTHOR_EMAIL:-${GIT_COMMITTER_EMAIL:-}}}"
if [[ -z "${EMAIL}" ]]; then
  EMAIL="$(git config user.email 2>/dev/null || true)"
fi

if [[ -z "${EMAIL}" ]]; then
  echo "Unable to determine your email for key aliasing."
  echo "Set one of: LITELLM_KEY_ALIAS, GIT_AUTHOR_EMAIL, or git config user.email"
  exit 1
fi

if ! command -v litellm-proxy >/dev/null 2>&1; then
  echo "Missing 'litellm-proxy' CLI."
  echo "Install (requires uv):"
  echo "  uv tool install 'litellm[proxy]'"
  echo "Then login:"
  echo "  export LITELLM_PROXY_URL=\"$BASE_URL\""
  echo "  litellm-proxy login"
  exit 1
fi

export LITELLM_PROXY_URL="${LITELLM_PROXY_URL:-$BASE_URL}"

DEV_TEAM_ID_DEFAULT="" # kibana-devs TODO: fetch from vault if necessary
TEAM_ID="${LITELLM_TEAM_ID:-$DEV_TEAM_ID_DEFAULT}"

echo "Checking LiteLLM CLI auth..."
WHOAMI_OUT="$(litellm-proxy whoami 2>/dev/null || true)"
if [[ -z "$WHOAMI_OUT" ]]; then
  echo "Not logged in."
  echo ""
  echo "Run this once (will open browser / interactive CLI):"
  echo "  export LITELLM_PROXY_URL=\"$BASE_URL\""
  echo "  litellm-proxy login"
  echo ""
  echo "Then re-run:"
  echo "  bash x-pack/platform/packages/shared/kbn-evals/scripts/litellm/dev_env.sh"
  exit 1
fi

# Some LiteLLM deployments require an API key for key-management routes (e.g. /key/generate).
# The CLI uses `LITELLM_PROXY_API_KEY` for that. If SSO login yielded a short-lived CLI key,
# try to extract it from `whoami` output; otherwise, ask the user to set it explicitly.
if [[ -z "${LITELLM_PROXY_API_KEY:-}" ]]; then
  MAYBE_KEY="$(printf '%s\n' "$WHOAMI_OUT" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const m=s.match(/sk-[A-Za-z0-9_-]+/); if(m) process.stdout.write(m[0]);});")"
  if [[ -n "$MAYBE_KEY" ]]; then
    export LITELLM_PROXY_API_KEY="$MAYBE_KEY"
  fi
fi

if [[ -z "${LITELLM_PROXY_API_KEY:-}" ]]; then
  echo "No LITELLM_PROXY_API_KEY detected."
  echo "Your LiteLLM instance appears to require an API key for /key/* routes."
  echo ""
  echo "After running 'litellm-proxy login', set:"
  echo "  export LITELLM_PROXY_API_KEY=<the sk-... key printed by the CLI/SSO>"
  echo ""
  echo "Then re-run this script."
  exit 1
fi

echo "Attempting to reuse an existing virtual key for alias: $EMAIL"
VIRTUAL_KEY="$(
  litellm-proxy keys list --format json --team-id "$TEAM_ID" --include-team-keys --key-alias "$EMAIL" 2>/dev/null \
    | node -e "const fs=require('fs');let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);const arr=Array.isArray(j)?j:(j.data||j.keys||j.items||[]);const key=arr.map(k=>k&&k.key).find(Boolean);if(key) process.stdout.write(String(key));}catch{}});"
)"

if [[ -z "$VIRTUAL_KEY" ]]; then
  echo "No existing key found; generating a new 24h virtual key..."
  # NOTE: We intentionally do not pin models here; the key should inherit team permissions.
  VIRTUAL_KEY="$(
    litellm-proxy keys generate --duration=24h --team-id "$TEAM_ID" --key-alias="$EMAIL" 2>/dev/null \
      | node -e "const fs=require('fs');let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);const key=j.key||j.api_key||j.token||j.data?.key||j.data?.api_key;if(key) process.stdout.write(String(key));}catch{}});"
  )"
fi

if [[ -z "$VIRTUAL_KEY" ]]; then
  echo "Failed to obtain a LiteLLM virtual key."
  echo "Try running and paste the output:"
  echo "  litellm-proxy keys generate --duration=24h --team-id \"$TEAM_ID\" --key-alias=\"$EMAIL\""
  exit 1
fi

export LITELLM_VIRTUAL_KEY="$VIRTUAL_KEY"

echo "Generating KIBANA_TESTING_AI_CONNECTORS from team \"$TEAM_NAME\"..."
KIBANA_TESTING_AI_CONNECTORS="$(
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
    --base-url "$BASE_URL" \
    --team-id "$TEAM_ID" \
    --team-name "$TEAM_NAME" \
    --api-key "$LITELLM_VIRTUAL_KEY" \
    --model-prefix "$MODEL_PREFIX"
)"

echo ""
echo "# Paste/run these in your shell:"
echo "export LITELLM_BASE_URL=\"$BASE_URL\""
echo "export LITELLM_TEAM_NAME=\"$TEAM_NAME\""
echo "export LITELLM_VIRTUAL_KEY=\"$LITELLM_VIRTUAL_KEY\""
echo "export KIBANA_TESTING_AI_CONNECTORS=\"$KIBANA_TESTING_AI_CONNECTORS\""
echo ""
echo "# Then run a suite:"
echo "# EVALUATION_CONNECTOR_ID=<one-of-the-generated-connector-ids> node scripts/evals run --suite agent-builder"

