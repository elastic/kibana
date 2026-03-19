#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Shared configuration and helpers for GCP compliance deployment scripts.
# Source this file from other scripts: source "$(dirname "$0")/env.sh"
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── GCP project ───────────────────────────────────────────────────────────────
export GCP_PROJECT="${GCP_PROJECT:-}"
export GCP_ZONE="${GCP_ZONE:-us-central1-a}"
export GCP_NETWORK="${GCP_NETWORK:-default}"
export GCP_LABEL="compliance-spike"

# ── Elastic Stack ─────────────────────────────────────────────────────────────
export STACK_VERSION="${STACK_VERSION:-9.0.0}"
export ES_URL="${ES_URL:-}"                       # e.g. https://my-cluster.es.cloud:443
export KIBANA_URL="${KIBANA_URL:-}"                # e.g. https://my-cluster.kb.cloud:443
export ES_USERNAME="${ES_USERNAME:-elastic}"
export ES_PASSWORD="${ES_PASSWORD:-changeme}"

# ── Fleet Server ──────────────────────────────────────────────────────────────
export FLEET_SERVER_VM="${FLEET_SERVER_VM:-compliance-fleet-server}"
export FLEET_SERVER_MACHINE_TYPE="${FLEET_SERVER_MACHINE_TYPE:-e2-medium}"
export FLEET_SERVER_PORT="${FLEET_SERVER_PORT:-8220}"

# ── Agents ────────────────────────────────────────────────────────────────────
export AGENT_COUNT="${AGENT_COUNT:-3}"
export AGENT_VM_PREFIX="${AGENT_VM_PREFIX:-compliance-agent}"
export AGENT_MACHINE_TYPE="${AGENT_MACHINE_TYPE:-e2-small}"

# ── Validation ────────────────────────────────────────────────────────────────
validate_env() {
  local missing=()
  [[ -z "$GCP_PROJECT" ]] && missing+=("GCP_PROJECT")
  [[ -z "$ES_URL" ]] && missing+=("ES_URL")
  [[ -z "$KIBANA_URL" ]] && missing+=("KIBANA_URL")

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: Required environment variables not set: ${missing[*]}"
    echo ""
    echo "  export GCP_PROJECT=my-gcp-project"
    echo "  export ES_URL=https://my-cluster.es.cloud:443"
    echo "  export KIBANA_URL=https://my-cluster.kb.cloud:443"
    echo "  export ES_USERNAME=elastic"
    echo "  export ES_PASSWORD=changeme"
    echo "  export STACK_VERSION=9.0.0"
    exit 1
  fi
}

# ── Helpers ───────────────────────────────────────────────────────────────────
kibana_api() {
  local method="$1" path="$2"
  shift 2
  curl -s -X "$method" "${KIBANA_URL}${path}" \
    -u "$ES_USERNAME:$ES_PASSWORD" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: 2023-10-31" \
    "$@"
}

es_api() {
  local method="$1" path="$2"
  shift 2
  curl -s -X "$method" "${ES_URL}${path}" \
    -u "$ES_USERNAME:$ES_PASSWORD" \
    -H "Content-Type: application/json" \
    "$@"
}

wait_for_kibana() {
  echo "  Waiting for Kibana API..."
  for i in $(seq 1 30); do
    status=$(kibana_api GET "/api/status" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',{}).get('overall',{}).get('level',''))" 2>/dev/null || echo "")
    if [[ "$status" == "available" ]]; then
      echo "  ✓ Kibana is available"
      return 0
    fi
    sleep 5
  done
  echo "  ⚠ Kibana did not become available in 150s — continuing anyway"
}

gcp_vm_exists() {
  gcloud compute instances describe "$1" --project="$GCP_PROJECT" --zone="$GCP_ZONE" &>/dev/null
}

gcp_vm_ip() {
  gcloud compute instances describe "$1" \
    --project="$GCP_PROJECT" --zone="$GCP_ZONE" \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null
}

print_header() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo " $1"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
}
