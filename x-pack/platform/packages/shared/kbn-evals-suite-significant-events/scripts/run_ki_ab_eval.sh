#!/usr/bin/env bash
# Significant Events KI A/B eval runbook — discovery agent, old vs old+new KIs (cart-redis-cutoff).
# Run from the Kibana repo root. Requires a Scout server started separately (see step 0).
set -euo pipefail

# --- Required env ---
: "${CONNECTOR_ID:?set CONNECTOR_ID to the model/connector project id to evaluate}"
: "${JUDGE_CONNECTOR_ID:?set JUDGE_CONNECTOR_ID to a Gemini 3 Pro connector id (for consistent judging)}"
: "${GCS_CREDENTIALS:?set GCS_CREDENTIALS to the service-account JSON for snapshot access}"
REPETITIONS="${REPETITIONS:-3}"
DATASET="${SIGEVENTS_DATASET:-otel-demo}"

echo "== Step 0: ensure a Scout server with tracing is running (in another terminal):"
echo "   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing"
echo

echo "== Step 1: baseline run (KI_SET=old) =="
SIGEVENTS_DATASET="$DATASET" SIGEVENTS_KI_SET=old \
  node scripts/evals run --suite significant-events \
    --project "$CONNECTOR_ID" --judge "$JUDGE_CONNECTOR_ID" \
    --repetitions "$REPETITIONS" discovery.spec.ts

echo "== Step 2: variant run (KI_SET=old+new) =="
SIGEVENTS_DATASET="$DATASET" SIGEVENTS_KI_SET=old+new \
  node scripts/evals run --suite significant-events \
    --project "$CONNECTOR_ID" --judge "$JUDGE_CONNECTOR_ID" \
    --repetitions "$REPETITIONS" discovery.spec.ts

echo
echo "== Step 3: compare the two experiments =="
echo "The two runs above print experiment ids/names. Compare them with:"
echo "   node scripts/evals compare <old-experiment> <old+new-experiment>"
echo
echo "Then verify (Task 4 Step 4) that the discovery agent actually RETRIEVED the new KIs"
echo "in the old+new run (inspect search_knowledge_indicators tool results / trace) — a null"
echo "relevance delta with no retrieved new KIs means 'not surfaced', not 'not useful'."
