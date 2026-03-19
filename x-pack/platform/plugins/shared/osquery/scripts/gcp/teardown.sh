#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Teardown all GCP resources created by the compliance spike scripts
#
# Deletes:
#   - Fleet Server VM
#   - All agent VMs
#   - Firewall rule
#   - Compliance osquery packs (from Kibana)
#   - Local state file
#
# Usage:
#   ./teardown.sh              # interactive confirmation
#   ./teardown.sh --force      # skip confirmation
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

if [[ -z "$GCP_PROJECT" ]]; then
  echo "ERROR: GCP_PROJECT not set"
  exit 1
fi

print_header "Tearing Down Compliance Spike Infrastructure"

echo "  GCP Project:  $GCP_PROJECT"
echo "  GCP Zone:     $GCP_ZONE"

# ── Discover VMs ──────────────────────────────────────────────────────────────
echo ""
echo "▸ Discovering compliance spike VMs..."

VMS=$(gcloud compute instances list \
  --project="$GCP_PROJECT" \
  --filter="labels.purpose=$GCP_LABEL" \
  --format="value(name,zone)" 2>/dev/null || echo "")

if [[ -z "$VMS" ]]; then
  echo "  No VMs found with label purpose=$GCP_LABEL"
else
  echo "  Found VMs:"
  echo "$VMS" | while read -r name zone; do
    echo "    • $name ($zone)"
  done
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
if [[ "$FORCE" != "true" ]]; then
  echo ""
  read -rp "  Delete all resources? [y/N] " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "  Aborted."
    exit 0
  fi
fi

# ── Delete VMs ────────────────────────────────────────────────────────────────
echo ""
echo "▸ Deleting VMs..."

if [[ -n "$VMS" ]]; then
  echo "$VMS" | while read -r name zone; do
    echo "  Deleting $name..."
    gcloud compute instances delete "$name" \
      --project="$GCP_PROJECT" --zone="$zone" --quiet 2>/dev/null || true
  done
  echo "  ✓ VMs deleted"
else
  echo "  No VMs to delete"
fi

# ── Delete firewall rule ─────────────────────────────────────────────────────
echo ""
echo "▸ Deleting firewall rules..."

RULE_NAME="allow-fleet-server-${FLEET_SERVER_PORT}"
if gcloud compute firewall-rules describe "$RULE_NAME" --project="$GCP_PROJECT" &>/dev/null; then
  gcloud compute firewall-rules delete "$RULE_NAME" \
    --project="$GCP_PROJECT" --quiet 2>/dev/null || true
  echo "  ✓ Deleted: $RULE_NAME"
else
  echo "  No firewall rule to delete"
fi

# ── Clean up Kibana resources ─────────────────────────────────────────────────
if [[ -n "${KIBANA_URL:-}" ]]; then
  echo ""
  echo "▸ Cleaning up Kibana resources..."

  # Delete compliance packs
  PACKS=$(kibana_api GET "/api/osquery/packs" 2>/dev/null | \
    python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data.get('data',{}).get('items',[]):
  if 'compliance' in p.get('name',''):
    print(p['id'])
" 2>/dev/null || echo "")

  for pack_id in $PACKS; do
    kibana_api DELETE "/api/osquery/packs/$pack_id" > /dev/null 2>&1 || true
    echo "  Deleted pack: $pack_id"
  done

  # Delete agent policies (this unenrolls agents first)
  for policy_name in "Compliance Spike - Osquery Endpoints" "Compliance Spike - Fleet Server"; do
    POLICY_ID=$(kibana_api GET "/api/fleet/agent_policies" 2>/dev/null | \
      python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data.get('items',[]):
  if p.get('name','') == '${policy_name}':
    print(p['id'])
    break
" 2>/dev/null || echo "")

    if [[ -n "$POLICY_ID" ]]; then
      kibana_api POST "/api/fleet/agent_policies/delete" -d "{\"agentPolicyId\": \"${POLICY_ID}\"}" > /dev/null 2>&1 || true
      echo "  Deleted policy: $policy_name ($POLICY_ID)"
    fi
  done

  echo "  ✓ Kibana cleanup complete"
fi

# ── Clean up local state ─────────────────────────────────────────────────────
STATE_FILE="$SCRIPT_DIR/.fleet_state"
if [[ -f "$STATE_FILE" ]]; then
  rm "$STATE_FILE"
  echo ""
  echo "▸ Deleted local state file"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
print_header "Teardown Complete"

echo "  All compliance spike GCP resources have been cleaned up."
echo ""
echo "  To also clean compliance data from Elasticsearch, run:"
echo "    ../seed_compliance_data.sh --clean"
echo ""
