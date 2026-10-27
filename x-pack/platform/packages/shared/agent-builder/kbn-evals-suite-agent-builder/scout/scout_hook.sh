#!/usr/bin/env bash
set -euo pipefail

# Scout hook for the agent-builder-regression suite (elastic/search-team#16080).
# Receives the evals config JSON on stdin and prints {"env": {...}}
# (parsed by @kbn/evals src/cli/scout_hook.ts).
#
# Pins the judge connector for regression runs: baselines are only comparable under a
# fixed judge, and the Vault default judge can change without a code change (see
# https://github.com/elastic/kibana/pull/297038), which would silently invalidate every
# stored baseline.
#
# A deliberately overridden judge differs from the Vault default and is left alone; an
# unset or default-inherited judge is replaced with the pin. Overrides reach this hook as
# EVAL_CONNECTOR_ID: in CI via the `models:judge:` label, locally via the env var or the
# `--evaluation-connector-id` flag (the CLI exports the resolved flag value to hooks).

PINNED_JUDGE_CONNECTOR_ID="eis-zai-glm-5-2"

# stdin is the evals config JSON; read it directly (no here-strings — old bash backs
# them with temp files, and the config may hold credentials).
vault_default="$(jq -r '.evaluationConnectorId // empty')"

if [[ -n "${EVAL_CONNECTOR_ID:-}" && "${EVAL_CONNECTOR_ID}" != "${vault_default}" ]]; then
  # Deliberate override — keep it.
  printf '{"env":{}}'
  exit 0
fi

jq -cn --arg judge "${PINNED_JUDGE_CONNECTOR_ID}" '{env: {EVAL_CONNECTOR_ID: $judge}}'
