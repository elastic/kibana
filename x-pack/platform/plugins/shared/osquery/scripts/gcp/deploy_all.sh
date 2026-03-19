#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# End-to-End Compliance Deployment Orchestrator
#
# Runs all deployment steps in sequence:
#   1. Deploy Fleet Server on GCP
#   2. Deploy Osquery Agents on GCP
#   3. Deploy compliance osquery packs
#   4. Seed sample scoring data (optional)
#
# Usage:
#   ./deploy_all.sh                              # full deployment
#   ./deploy_all.sh --skip-seed                  # skip sample data seeding
#   ./deploy_all.sh --agents 6                   # deploy 6 agents
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP_PROJECT, ES_URL, KIBANA_URL set
#   - Elasticsearch and Kibana running
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"

SKIP_SEED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-seed) SKIP_SEED=true; shift ;;
    --agents) export AGENT_COUNT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

validate_env

print_header "Endpoint Compliance E2E Deployment"

echo "  GCP Project:    $GCP_PROJECT"
echo "  GCP Zone:       $GCP_ZONE"
echo "  Stack Version:  $STACK_VERSION"
echo "  ES URL:         $ES_URL"
echo "  Kibana URL:     $KIBANA_URL"
echo "  Agent Count:    $AGENT_COUNT"
echo "  Seed Data:      $([ "$SKIP_SEED" = true ] && echo "skip" || echo "yes")"
echo ""
echo "  This will create $((AGENT_COUNT + 1)) GCP VMs (1 Fleet Server + $AGENT_COUNT agents)."
echo ""
read -rp "  Proceed? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "  Aborted."
  exit 0
fi

STARTED_AT=$(date +%s)

# ── Phase 1: Fleet Server ────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Phase 1/4: Fleet Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy_fleet_server.sh"

# ── Phase 2: Osquery Agents ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Phase 2/4: Osquery Agents ($AGENT_COUNT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy_osquery_agents.sh"

# ── Phase 3: Compliance Packs ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Phase 3/4: Compliance Packs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy_compliance_packs.sh"

# ── Phase 4: Sample Data (optional) ──────────────────────────────────────────
if [[ "$SKIP_SEED" != "true" ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Phase 4/4: Seed Sample Score History"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  bash "$(dirname "$SCRIPT_DIR")/seed_compliance_data.sh" --days 3
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Phase 4/4: Skipped (--skip-seed)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# ── Final Summary ─────────────────────────────────────────────────────────────
ENDED_AT=$(date +%s)
DURATION=$(( ENDED_AT - STARTED_AT ))
DURATION_MIN=$(( DURATION / 60 ))

# Load state
STATE_FILE="$SCRIPT_DIR/.fleet_state"
[[ -f "$STATE_FILE" ]] && source "$STATE_FILE"

print_header "E2E Deployment Complete (${DURATION_MIN}m ${DURATION}s)"

echo "  Infrastructure:"
echo "    Fleet Server:    ${FLEET_URL:-unknown}"
echo "    Agent Count:     $AGENT_COUNT"
echo "    GCP VMs:         $((AGENT_COUNT + 1))"
echo ""
echo "  Kibana URLs:"
echo "    Fleet Agents:    ${KIBANA_URL}/app/fleet/agents"
echo "    Osquery Packs:   ${KIBANA_URL}/app/osquery/packs"
echo "    Live Queries:    ${KIBANA_URL}/app/osquery/live_queries"
echo "    Compliance:      ${KIBANA_URL}/app/osquery/compliance"
echo ""
echo "  What happens next:"
echo "    1. Osquery packs execute every 5 minutes on enrolled agents"
echo "    2. Results flow to logs-osquery_manager.result-default"
echo "    3. Finding Evaluator polls results and writes to"
echo "       logs-endpoint_compliance.findings-default"
echo "    4. Score Aggregation task computes scores every 5 minutes"
echo "    5. Dashboard shows real compliance posture"
echo ""
echo "  First real findings should appear in ~5-10 minutes."
echo ""
echo "  To tear down everything:"
echo "    $SCRIPT_DIR/teardown.sh"
echo ""
