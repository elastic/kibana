#!/usr/bin/env bash
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.

set -euo pipefail

usage() {
  cat <<'EOF'
Run the Streams eval suite against an EIS-backed connector (Scout + CCM + Playwright).

Prerequisites: vault CLI logged in (OIDC), repo bootstrapped (yarn kbn bootstrap).

Usage:
  run_stream_evals_eis.sh <evaluation-connector-id> [grep]

Arguments:
  evaluation-connector-id   EIS connector id (e.g. eis-google-gemini-3-1-pro)
  grep                      Optional Playwright --grep (default: Pipeline suggestion)

Steps:
  - export KIBANA_EIS_CCM_API_KEY from Vault
  - node scripts/discover_eis_models.js (only if target/eis_models.json is missing)
  - export KIBANA_TESTING_AI_CONNECTORS from generate_eis_connectors.js
  - node scripts/evals start --suite streams ...

When done: node scripts/evals stop
EOF
  exit 1
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
fi

CONNECTOR_ID="$1"
GREP_PATTERN="${2:-Pipeline suggestion}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel)"

cd "$REPO_ROOT"

export KIBANA_EIS_CCM_API_KEY="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"

EIS_MODELS_JSON="$REPO_ROOT/target/eis_models.json"
if [[ ! -f "$EIS_MODELS_JSON" ]]; then
  echo "[run_stream_evals_eis] Discovering EIS models (writing $EIS_MODELS_JSON)..."
  node scripts/discover_eis_models.js
else
  echo "[run_stream_evals_eis] Reusing existing $EIS_MODELS_JSON (delete it to re-discover)"
fi

GEN_CONNECTORS="$REPO_ROOT/x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js"
echo "[run_stream_evals_eis] Generating KIBANA_TESTING_AI_CONNECTORS..."
export KIBANA_TESTING_AI_CONNECTORS="$(node "$GEN_CONNECTORS")"

echo "[run_stream_evals_eis] Starting evals (connector=$CONNECTOR_ID, grep=$GREP_PATTERN)..."
node scripts/evals start --suite streams \
  --project "$CONNECTOR_ID" \
  --evaluation-connector-id "$CONNECTOR_ID" \
  --grep "$GREP_PATTERN"
