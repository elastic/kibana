#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Deploy Fleet Server on a GCP VM
#
# Creates:
#   1. An agent policy for Fleet Server in Kibana
#   2. A Fleet Server service token
#   3. A GCP VM running Elastic Agent in Fleet Server mode
#
# Usage:
#   ./deploy_fleet_server.sh
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"
validate_env

print_header "Deploying Fleet Server to GCP"

echo "  GCP Project:    $GCP_PROJECT"
echo "  GCP Zone:       $GCP_ZONE"
echo "  VM Name:        $FLEET_SERVER_VM"
echo "  Stack Version:  $STACK_VERSION"
echo "  ES URL:         $ES_URL"
echo "  Kibana URL:     $KIBANA_URL"

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
echo ""
echo "▸ Checking prerequisites..."

if ! command -v gcloud &>/dev/null; then
  echo "  ✗ gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
echo "  ✓ gcloud CLI available"

wait_for_kibana

# ── Step 2: Create Fleet Server policy ────────────────────────────────────────
echo ""
echo "▸ Creating Fleet Server agent policy..."

FLEET_POLICY_RESPONSE=$(kibana_api POST "/api/fleet/agent_policies" -d '{
  "name": "Compliance Spike - Fleet Server",
  "namespace": "default",
  "description": "Fleet Server policy for endpoint compliance spike",
  "monitoring_enabled": ["logs", "metrics"],
  "has_fleet_server": true
}')

FLEET_POLICY_ID=$(echo "$FLEET_POLICY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('id',''))" 2>/dev/null || echo "")

if [[ -z "$FLEET_POLICY_ID" ]]; then
  echo "  ⚠ Could not create new policy, checking for existing..."
  FLEET_POLICY_ID=$(kibana_api GET "/api/fleet/agent_policies" 2>/dev/null | \
    python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data.get('items',[]):
  if 'Compliance Spike - Fleet Server' in p.get('name',''):
    print(p['id'])
    break
" 2>/dev/null || echo "")
fi

if [[ -z "$FLEET_POLICY_ID" ]]; then
  echo "  ✗ Failed to create or find Fleet Server policy"
  exit 1
fi
echo "  ✓ Fleet Server policy: $FLEET_POLICY_ID"

# ── Step 3: Generate Fleet Server service token ───────────────────────────────
echo ""
echo "▸ Generating Fleet Server service token..."

SERVICE_TOKEN_RESPONSE=$(kibana_api POST "/api/fleet/service_tokens" -d '{}')
SERVICE_TOKEN=$(echo "$SERVICE_TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null || echo "")

if [[ -z "$SERVICE_TOKEN" ]]; then
  echo "  ✗ Failed to generate service token"
  echo "  Response: $SERVICE_TOKEN_RESPONSE"
  exit 1
fi
echo "  ✓ Service token generated"

# ── Step 4: Configure Fleet settings ─────────────────────────────────────────
echo ""
echo "▸ Configuring Fleet output settings..."

kibana_api PUT "/api/fleet/settings" -d "{
  \"fleet_server_hosts\": [\"https://0.0.0.0:${FLEET_SERVER_PORT}\"]
}" > /dev/null 2>&1

kibana_api PUT "/api/fleet/outputs/fleet-default-output" -d "{
  \"hosts\": [\"${ES_URL}\"]
}" > /dev/null 2>&1 || true

echo "  ✓ Fleet settings configured"

# ── Step 5: Create GCP VM ────────────────────────────────────────────────────
echo ""
echo "▸ Creating GCP VM: $FLEET_SERVER_VM..."

if gcp_vm_exists "$FLEET_SERVER_VM"; then
  echo "  ⚠ VM already exists, deleting..."
  gcloud compute instances delete "$FLEET_SERVER_VM" \
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

# Install as Fleet Server
./elastic-agent install \\
  --fleet-server-es="${ES_URL}" \\
  --fleet-server-service-token="${SERVICE_TOKEN}" \\
  --fleet-server-policy="${FLEET_POLICY_ID}" \\
  --fleet-server-port=${FLEET_SERVER_PORT} \\
  --fleet-server-es-insecure \\
  --insecure \\
  --non-interactive \\
  --force

echo "Fleet Server installation complete" > /var/log/fleet-server-install.log
STARTUP
)

gcloud compute instances create "$FLEET_SERVER_VM" \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  --machine-type="$FLEET_SERVER_MACHINE_TYPE" \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=fleet-server,compliance-spike \
  --labels="purpose=$GCP_LABEL" \
  --metadata=startup-script="$STARTUP_SCRIPT" \
  --scopes=default

echo "  ✓ VM created"

# ── Step 6: Open firewall ────────────────────────────────────────────────────
echo ""
echo "▸ Ensuring firewall rule for Fleet Server port..."

RULE_NAME="allow-fleet-server-${FLEET_SERVER_PORT}"
if ! gcloud compute firewall-rules describe "$RULE_NAME" --project="$GCP_PROJECT" &>/dev/null; then
  gcloud compute firewall-rules create "$RULE_NAME" \
    --project="$GCP_PROJECT" \
    --network="$GCP_NETWORK" \
    --allow="tcp:${FLEET_SERVER_PORT}" \
    --target-tags=fleet-server \
    --source-ranges="0.0.0.0/0" \
    --description="Allow Fleet Server enrollment" \
    --quiet
  echo "  ✓ Firewall rule created"
else
  echo "  ✓ Firewall rule exists"
fi

# ── Step 7: Wait for VM and get IP ───────────────────────────────────────────
echo ""
echo "▸ Waiting for VM to be ready..."
sleep 10

FLEET_IP=$(gcp_vm_ip "$FLEET_SERVER_VM")
FLEET_URL="https://${FLEET_IP}:${FLEET_SERVER_PORT}"

echo "  ✓ Fleet Server IP: $FLEET_IP"

# ── Step 8: Update Fleet Server hosts in Kibana ──────────────────────────────
echo ""
echo "▸ Updating Fleet Server URL in Kibana settings..."

kibana_api PUT "/api/fleet/settings" -d "{
  \"fleet_server_hosts\": [\"${FLEET_URL}\"]
}" > /dev/null 2>&1

echo "  ✓ Fleet Server URL set to $FLEET_URL"

# ── Step 9: Wait for Fleet Server to come online ─────────────────────────────
echo ""
echo "▸ Waiting for Fleet Server to come online (this may take 2-3 minutes)..."

for i in $(seq 1 36); do
  AGENTS=$(kibana_api GET "/api/fleet/agents?perPage=1&kuery=policy_id:${FLEET_POLICY_ID}" 2>/dev/null)
  ONLINE=$(echo "$AGENTS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
for a in data.get('items',[]):
  if a.get('status') in ('online','degraded'):
    print('yes')
    break
" 2>/dev/null || echo "")
  if [[ "$ONLINE" == "yes" ]]; then
    echo "  ✓ Fleet Server is online!"
    break
  fi
  echo "    ...attempt $i/36 — waiting 10s"
  sleep 10
done

# ── Summary ───────────────────────────────────────────────────────────────────
print_header "Fleet Server Deployed"

echo "  VM Name:          $FLEET_SERVER_VM"
echo "  External IP:      $FLEET_IP"
echo "  Fleet URL:        $FLEET_URL"
echo "  Policy ID:        $FLEET_POLICY_ID"
echo "  Service Token:    ${SERVICE_TOKEN:0:20}..."
echo ""
echo "  Save these for agent enrollment:"
echo "    export FLEET_URL=$FLEET_URL"
echo "    export FLEET_POLICY_ID=$FLEET_POLICY_ID"
echo ""

# Write state for other scripts to use
STATE_FILE="$SCRIPT_DIR/.fleet_state"
cat > "$STATE_FILE" <<STATE
FLEET_IP=$FLEET_IP
FLEET_URL=$FLEET_URL
FLEET_POLICY_ID=$FLEET_POLICY_ID
SERVICE_TOKEN=$SERVICE_TOKEN
STATE

echo "  State saved to: $STATE_FILE"
echo ""
