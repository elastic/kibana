#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Deploy compliance osquery packs to enrolled agents via Kibana API
#
# Creates osquery packs from the prebuilt compliance rules and assigns
# them to the agent policy used by the compliance endpoints.
#
# Usage:
#   ./deploy_compliance_packs.sh
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"
validate_env

STATE_FILE="$SCRIPT_DIR/.fleet_state"
if [[ -f "$STATE_FILE" ]]; then
  source "$STATE_FILE"
fi

AGENT_POLICY_ID="${AGENT_POLICY_ID:-}"
if [[ -z "$AGENT_POLICY_ID" ]]; then
  echo "ERROR: AGENT_POLICY_ID not set. Run deploy_osquery_agents.sh first."
  exit 1
fi

print_header "Deploying Compliance Osquery Packs"

echo "  Kibana URL:       $KIBANA_URL"
echo "  Agent Policy ID:  $AGENT_POLICY_ID"

# ── Step 1: Get enrolled agent IDs for the policy ─────────────────────────────
echo ""
echo "▸ Finding enrolled agents..."

AGENT_IDS=$(kibana_api GET "/api/fleet/agents?perPage=100&kuery=policy_id:${AGENT_POLICY_ID}" 2>/dev/null | \
  python3 -c "
import sys,json
data = json.load(sys.stdin)
ids = [a['id'] for a in data.get('items',[]) if a.get('status') in ('online','degraded')]
print(','.join(ids))
" 2>/dev/null || echo "")

if [[ -z "$AGENT_IDS" ]]; then
  echo "  ⚠ No online agents found. Packs will be created but may not execute until agents come online."
fi

AGENT_COUNT_ONLINE=$(echo "$AGENT_IDS" | tr ',' '\n' | grep -c . || echo "0")
echo "  ✓ Found $AGENT_COUNT_ONLINE online agents"

# ── Step 2: Create CIS Linux compliance pack ─────────────────────────────────
echo ""
echo "▸ Creating CIS Ubuntu 22.04 compliance pack..."

LINUX_PACK_RESPONSE=$(kibana_api POST "/api/osquery/packs" -d "{
  \"name\": \"compliance-cis-ubuntu-22\",
  \"description\": \"CIS Ubuntu Linux 22.04 LTS compliance checks\",
  \"enabled\": true,
  \"policy_ids\": [\"${AGENT_POLICY_ID}\"],
  \"queries\": {
    \"compliance-cis_ubuntu_22_1_1_1\": {
      \"query\": \"SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS compliant FROM mounts WHERE path = '/tmp' AND type != '' LIMIT 1;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_3_4_1_1\": {
      \"query\": \"SELECT 1 FROM deb_packages WHERE name = 'ufw' AND status = 'install ok installed' LIMIT 1;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_5_2_4\": {
      \"query\": \"SELECT 1 FROM augeas WHERE path = '/etc/ssh/sshd_config' AND label = 'MaxAuthTries' AND CAST(value AS INTEGER) <= 4;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_5_2_1\": {
      \"query\": \"SELECT 1 FROM augeas WHERE path = '/etc/ssh/sshd_config' AND label = 'Protocol' AND value = '2';\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_4_2_1\": {
      \"query\": \"SELECT 1 FROM shadow WHERE password_status = 'P' AND hash_alg = 'SHA-512' LIMIT 1;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_1_8_1\": {
      \"query\": \"SELECT 1 FROM deb_packages WHERE name = 'aide' AND status = 'install ok installed' LIMIT 1;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_5_4_1\": {
      \"query\": \"SELECT 1 FROM augeas WHERE path = '/etc/login.defs' AND label = 'PASS_MAX_DAYS' AND CAST(value AS INTEGER) <= 365;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_6_1_2\": {
      \"query\": \"SELECT 1 FROM file WHERE path = '/etc/passwd' AND mode = '0644';\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_3_1_1\": {
      \"query\": \"SELECT 1 FROM system_controls WHERE name = 'net.ipv4.ip_forward' AND current_value = '0';\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-cis_ubuntu_22_2_2_1\": {
      \"query\": \"SELECT 1 FROM deb_packages WHERE name IN ('ntp', 'chrony', 'systemd-timesyncd') AND status = 'install ok installed' LIMIT 1;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    }
  }
}")

PACK_ID=$(echo "$LINUX_PACK_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$PACK_ID" ]]; then
  echo "  ✓ Pack created: compliance-cis-ubuntu-22 (ID: $PACK_ID)"
else
  echo "  ⚠ Pack may already exist or API returned unexpected format"
  echo "  Response: $(echo "$LINUX_PACK_RESPONSE" | head -c 200)"
fi

# ── Step 3: Create a general system info pack (runs on all platforms) ─────────
echo ""
echo "▸ Creating cross-platform system info pack..."

SYSINFO_PACK_RESPONSE=$(kibana_api POST "/api/osquery/packs" -d "{
  \"name\": \"compliance-system-baseline\",
  \"description\": \"Cross-platform system baseline checks for compliance monitoring\",
  \"enabled\": true,
  \"policy_ids\": [\"${AGENT_POLICY_ID}\"],
  \"queries\": {
    \"compliance-os-version\": {
      \"query\": \"SELECT name, version, major, minor, patch, platform FROM os_version;\",
      \"interval\": 600,
      \"version\": \"5.0.0\"
    },
    \"compliance-disk-encryption\": {
      \"query\": \"SELECT name, encrypted, type FROM disk_encryption;\",
      \"interval\": 600,
      \"version\": \"5.0.0\"
    },
    \"compliance-listening-ports\": {
      \"query\": \"SELECT pid, port, protocol, address FROM listening_ports WHERE port < 1024;\",
      \"interval\": 300,
      \"version\": \"5.0.0\"
    },
    \"compliance-users\": {
      \"query\": \"SELECT uid, gid, username, shell FROM users WHERE uid < 1000 AND uid > 0;\",
      \"interval\": 600,
      \"version\": \"5.0.0\"
    },
    \"compliance-sshd-config\": {
      \"query\": \"SELECT * FROM augeas WHERE path = '/etc/ssh/sshd_config' AND label IN ('PermitRootLogin', 'PasswordAuthentication', 'MaxAuthTries', 'Protocol');\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-firewall-status\": {
      \"query\": \"SELECT CASE WHEN COUNT(*) > 0 THEN 'active' ELSE 'inactive' END AS status FROM iptables;\",
      \"interval\": 300,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-kernel-modules\": {
      \"query\": \"SELECT name, status, size FROM kernel_modules WHERE status = 'Live' ORDER BY size DESC LIMIT 20;\",
      \"interval\": 600,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    },
    \"compliance-crontab\": {
      \"query\": \"SELECT event, command, path FROM crontab;\",
      \"interval\": 600,
      \"platform\": \"linux\",
      \"version\": \"5.0.0\"
    }
  }
}")

PACK_ID2=$(echo "$SYSINFO_PACK_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$PACK_ID2" ]]; then
  echo "  ✓ Pack created: compliance-system-baseline (ID: $PACK_ID2)"
else
  echo "  ⚠ Pack may already exist or API returned unexpected format"
fi

# ── Step 4: Verify packs are assigned ─────────────────────────────────────────
echo ""
echo "▸ Verifying pack assignments..."

PACKS_RESPONSE=$(kibana_api GET "/api/osquery/packs" 2>/dev/null)
PACK_COUNT=$(echo "$PACKS_RESPONSE" | python3 -c "
import sys,json
data = json.load(sys.stdin)
packs = [p for p in data.get('data',{}).get('items',[]) if 'compliance' in p.get('name','')]
print(len(packs))
" 2>/dev/null || echo "0")

echo "  ✓ $PACK_COUNT compliance packs found in Kibana"

# ── Summary ───────────────────────────────────────────────────────────────────
print_header "Compliance Packs Deployed"

echo "  Packs deployed:"
echo "    • compliance-cis-ubuntu-22     (10 CIS queries, 5m interval)"
echo "    • compliance-system-baseline   (8 system queries, 5-10m interval)"
echo ""
echo "  Assigned to policy: $AGENT_POLICY_ID"
echo "  Online agents:      $AGENT_COUNT_ONLINE"
echo ""
echo "  Results will start flowing in ~5 minutes."
echo "  Check: ${KIBANA_URL}/app/osquery/live_queries"
echo ""
echo "  Once the Finding Evaluator processes results, findings appear at:"
echo "  ${KIBANA_URL}/app/osquery/compliance/findings"
echo ""
