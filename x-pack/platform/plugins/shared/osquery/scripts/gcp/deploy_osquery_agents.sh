#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Deploy Osquery Agents on GCP VMs
#
# Creates:
#   1. An agent policy with the osquery_manager integration
#   2. An enrollment token
#   3. N GCP VMs running Elastic Agent enrolled to Fleet Server
#
# Supports mixed OS: Ubuntu and Debian for Linux variety.
# (Windows/macOS VMs are possible on GCP but require special images/licenses)
#
# Usage:
#   ./deploy_osquery_agents.sh                 # 3 agents
#   AGENT_COUNT=6 ./deploy_osquery_agents.sh   # 6 agents
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"
validate_env

# Load Fleet Server state if available
STATE_FILE="$SCRIPT_DIR/.fleet_state"
if [[ -f "$STATE_FILE" ]]; then
  source "$STATE_FILE"
  echo "  Loaded Fleet state from $STATE_FILE"
fi

# Fleet URL can be overridden
FLEET_URL="${FLEET_URL:-}"
if [[ -z "$FLEET_URL" ]]; then
  echo "ERROR: FLEET_URL not set. Run deploy_fleet_server.sh first or set FLEET_URL."
  exit 1
fi

print_header "Deploying $AGENT_COUNT Osquery Agents to GCP"

echo "  GCP Project:    $GCP_PROJECT"
echo "  GCP Zone:       $GCP_ZONE"
echo "  Agent Count:    $AGENT_COUNT"
echo "  Stack Version:  $STACK_VERSION"
echo "  Fleet URL:      $FLEET_URL"
echo "  Kibana URL:     $KIBANA_URL"

# ── Step 1: Get osquery integration version ───────────────────────────────────
echo ""
echo "▸ Looking up osquery_manager integration version..."

OSQUERY_VERSION=$(kibana_api GET "/api/fleet/epm/packages/osquery_manager" 2>/dev/null | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('version',''))" 2>/dev/null || echo "")

if [[ -z "$OSQUERY_VERSION" ]]; then
  echo "  ⚠ Could not detect osquery_manager version, attempting install..."
  kibana_api POST "/api/fleet/epm/packages/osquery_manager" -d '{"force": true}' > /dev/null 2>&1
  sleep 5
  OSQUERY_VERSION=$(kibana_api GET "/api/fleet/epm/packages/osquery_manager" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('version',''))" 2>/dev/null || echo "1.12.1")
fi
echo "  ✓ osquery_manager version: $OSQUERY_VERSION"

# ── Step 2: Create agent policy with osquery integration ──────────────────────
echo ""
echo "▸ Creating agent policy with osquery integration..."

AGENT_POLICY_RESPONSE=$(kibana_api POST "/api/fleet/agent_policies" -d '{
  "name": "Compliance Spike - Osquery Endpoints",
  "namespace": "default",
  "description": "Agent policy for endpoint compliance monitoring spike",
  "monitoring_enabled": ["logs", "metrics"]
}')

AGENT_POLICY_ID=$(echo "$AGENT_POLICY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('id',''))" 2>/dev/null || echo "")

if [[ -z "$AGENT_POLICY_ID" ]]; then
  echo "  ⚠ Policy may already exist, searching..."
  AGENT_POLICY_ID=$(kibana_api GET "/api/fleet/agent_policies" 2>/dev/null | \
    python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data.get('items',[]):
  if 'Compliance Spike - Osquery Endpoints' in p.get('name',''):
    print(p['id'])
    break
" 2>/dev/null || echo "")
fi

if [[ -z "$AGENT_POLICY_ID" ]]; then
  echo "  ✗ Failed to create agent policy"
  exit 1
fi
echo "  ✓ Agent policy: $AGENT_POLICY_ID"

# ── Step 3: Add osquery_manager integration to policy ─────────────────────────
echo ""
echo "▸ Adding osquery_manager integration to policy..."

PACKAGE_POLICY_RESPONSE=$(kibana_api POST "/api/fleet/package_policies" -d "{
  \"policy_id\": \"${AGENT_POLICY_ID}\",
  \"package\": {
    \"name\": \"osquery_manager\",
    \"version\": \"${OSQUERY_VERSION}\"
  },
  \"name\": \"osquery_manager-compliance-spike\",
  \"description\": \"Osquery integration for compliance monitoring\",
  \"namespace\": \"default\",
  \"inputs\": {
    \"osquery_manager-osquery\": {
      \"enabled\": true,
      \"streams\": {}
    }
  }
}")

PKG_POLICY_ID=$(echo "$PACKAGE_POLICY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -z "$PKG_POLICY_ID" ]]; then
  echo "  ⚠ osquery integration may already be attached (this is fine)"
else
  echo "  ✓ osquery integration added: $PKG_POLICY_ID"
fi

# ── Step 4: Get enrollment token ─────────────────────────────────────────────
echo ""
echo "▸ Getting enrollment token..."

ENROLLMENT_RESPONSE=$(kibana_api GET "/api/fleet/enrollment_api_keys?perPage=100" 2>/dev/null)
ENROLLMENT_TOKEN=$(echo "$ENROLLMENT_RESPONSE" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for key in data.get('items',[]):
  if key.get('policy_id') == '${AGENT_POLICY_ID}' and key.get('active'):
    print(key.get('api_key',''))
    break
" 2>/dev/null || echo "")

if [[ -z "$ENROLLMENT_TOKEN" ]]; then
  echo "  ✗ No enrollment token found for policy $AGENT_POLICY_ID"
  exit 1
fi
echo "  ✓ Enrollment token: ${ENROLLMENT_TOKEN:0:20}..."

# ── Step 5: Create agent VMs ─────────────────────────────────────────────────
echo ""
echo "▸ Creating $AGENT_COUNT agent VMs..."

# Alternate between Ubuntu 22.04 and Debian 12 for OS variety
IMAGE_FAMILIES=("ubuntu-2204-lts" "debian-12")
IMAGE_PROJECTS=("ubuntu-os-cloud" "debian-cloud")
OS_LABELS=("ubuntu-22" "debian-12")

AGENT_IPS=()

for i in $(seq 1 "$AGENT_COUNT"); do
  VM_NAME="${AGENT_VM_PREFIX}-$(printf '%02d' "$i")"
  OS_IDX=$(( (i - 1) % ${#IMAGE_FAMILIES[@]} ))
  IMAGE_FAMILY="${IMAGE_FAMILIES[$OS_IDX]}"
  IMAGE_PROJECT="${IMAGE_PROJECTS[$OS_IDX]}"
  OS_LABEL="${OS_LABELS[$OS_IDX]}"

  echo ""
  echo "  ── Agent $i/$AGENT_COUNT: $VM_NAME ($OS_LABEL) ──"

  if gcp_vm_exists "$VM_NAME"; then
    echo "    ⚠ VM exists, deleting..."
    gcloud compute instances delete "$VM_NAME" \
      --project="$GCP_PROJECT" --zone="$GCP_ZONE" --quiet
  fi

  STARTUP_SCRIPT=$(cat <<STARTUP
#!/bin/bash
set -ex

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq curl jq

# Download and install Elastic Agent
cd /tmp
AGENT_TAR="elastic-agent-${STACK_VERSION}-linux-x86_64.tar.gz"
curl -sL "https://artifacts.elastic.co/downloads/beats/elastic-agent/\${AGENT_TAR}" -o "\${AGENT_TAR}"
tar xzf "\${AGENT_TAR}"
cd "elastic-agent-${STACK_VERSION}-linux-x86_64"

# Enroll to Fleet Server
./elastic-agent install \\
  --url="${FLEET_URL}" \\
  --enrollment-token="${ENROLLMENT_TOKEN}" \\
  --insecure \\
  --non-interactive \\
  --force

echo "Agent installation complete" > /var/log/agent-install.log
STARTUP
)

  gcloud compute instances create "$VM_NAME" \
    --project="$GCP_PROJECT" \
    --zone="$GCP_ZONE" \
    --machine-type="$AGENT_MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" \
    --image-project="$IMAGE_PROJECT" \
    --boot-disk-size=20GB \
    --tags=compliance-agent,compliance-spike \
    --labels="purpose=$GCP_LABEL,os=$OS_LABEL" \
    --metadata=startup-script="$STARTUP_SCRIPT" \
    --scopes=default

  VM_IP=$(gcp_vm_ip "$VM_NAME")
  AGENT_IPS+=("$VM_IP")
  echo "    ✓ Created: $VM_NAME ($VM_IP)"
done

# ── Step 6: Wait for agents to enroll ─────────────────────────────────────────
echo ""
echo "▸ Waiting for agents to enroll (this may take 3-5 minutes)..."

for attempt in $(seq 1 36); do
  ONLINE_COUNT=$(kibana_api GET "/api/fleet/agents?perPage=1&kuery=policy_id:${AGENT_POLICY_ID}%20AND%20(status:online%20OR%20status:degraded)" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "0")

  echo "    ...attempt $attempt/36 — $ONLINE_COUNT/$AGENT_COUNT agents online"

  if [[ "$ONLINE_COUNT" -ge "$AGENT_COUNT" ]]; then
    echo "  ✓ All $AGENT_COUNT agents enrolled and online!"
    break
  fi
  sleep 10
done

# ── Summary ───────────────────────────────────────────────────────────────────
print_header "Osquery Agents Deployed"

echo "  Agents:           $AGENT_COUNT VMs"
echo "  Agent Policy:     $AGENT_POLICY_ID"
echo "  Fleet URL:        $FLEET_URL"
echo ""
echo "  VMs:"
for i in $(seq 0 $((AGENT_COUNT - 1))); do
  OS_IDX=$(( i % ${#OS_LABELS[@]} ))
  echo "    ${AGENT_VM_PREFIX}-$(printf '%02d' $((i+1)))  ${AGENT_IPS[$i]:-?}  (${OS_LABELS[$OS_IDX]})"
done
echo ""
echo "  Next steps:"
echo "    1. Verify in Kibana Fleet: ${KIBANA_URL}/app/fleet/agents"
echo "    2. Deploy compliance packs: ./deploy_compliance_packs.sh"
echo ""

# Append to state
cat >> "$STATE_FILE" <<STATE
AGENT_POLICY_ID=$AGENT_POLICY_ID
ENROLLMENT_TOKEN=$ENROLLMENT_TOKEN
STATE
