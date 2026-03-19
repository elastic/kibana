#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Endpoint Compliance Monitoring — Sample Data Seed Script
#
# Seeds realistic compliance findings and score history into Elasticsearch
# for local development and demo purposes.
#
# Prerequisites:
#   - Elasticsearch running on localhost:9200 (or set ES_URL)
#   - Kibana running with the endpointComplianceMonitoring feature flag enabled
#   - Index templates must exist (Kibana creates them on startup)
#
# Usage:
#   ./seed_compliance_data.sh                          # defaults (localhost:9200, elastic/changeme)
#   ES_URL=https://my-es:9200 ES_API_KEY=... ./seed_compliance_data.sh
#   ./seed_compliance_data.sh --hosts 20 --days 7      # 20 hosts, 7 days of history
#   ./seed_compliance_data.sh --clean                   # delete all compliance data first
#
# Environment variables:
#   ES_URL        Elasticsearch URL   (default: http://localhost:9200)
#   ES_API_KEY    API key auth        (takes precedence over user/pass)
#   ES_USERNAME   Basic auth user     (default: elastic)
#   ES_PASSWORD   Basic auth password (default: changeme)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ES_URL="${ES_URL:-http://localhost:9200}"
ES_USERNAME="${ES_USERNAME:-elastic}"
ES_PASSWORD="${ES_PASSWORD:-changeme}"

NUM_HOSTS=8
NUM_DAYS=3
CLEAN=false
FINDINGS_DS="logs-endpoint_compliance.findings-default"
SCORES_DS="logs-endpoint_compliance.scores-default"
LATEST_INDEX="endpoint_compliance.findings_latest-default"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --hosts) NUM_HOSTS="$2"; shift 2 ;;
    --days) NUM_DAYS="$2"; shift 2 ;;
    --clean) CLEAN=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Auth header
if [[ -n "${ES_API_KEY:-}" ]]; then
  AUTH=(-H "Authorization: ApiKey $ES_API_KEY")
else
  AUTH=(-u "$ES_USERNAME:$ES_PASSWORD")
fi

es_request() {
  local method="$1" path="$2"
  shift 2
  curl -s -X "$method" "${ES_URL}${path}" \
    "${AUTH[@]}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "═══════════════════════════════════════════════════════════════"
echo " Endpoint Compliance — Sample Data Seeder"
echo "═══════════════════════════════════════════════════════════════"
echo " ES_URL:     $ES_URL"
echo " Hosts:      $NUM_HOSTS"
echo " Days:       $NUM_DAYS"
echo " Clean:      $CLEAN"
echo "═══════════════════════════════════════════════════════════════"

# ── Health check ──────────────────────────────────────────────────────────────
echo ""
echo "▸ Checking Elasticsearch connectivity..."
HEALTH=$(es_request GET "/_cluster/health?timeout=5s" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','error'))" 2>/dev/null || echo "unreachable")
if [[ "$HEALTH" == "unreachable" || "$HEALTH" == "error" ]]; then
  echo "  ✗ Cannot reach Elasticsearch at $ES_URL"
  echo "    Make sure ES is running and credentials are correct."
  exit 1
fi
echo "  ✓ Cluster health: $HEALTH"

echo ""
echo "▸ Checking dependencies..."
for dep in python3 openssl curl; do
  if ! command -v "$dep" &>/dev/null; then
    echo "  ✗ Required dependency not found: $dep"
    exit 1
  fi
done
echo "  ✓ All dependencies available"

# ── Clean ─────────────────────────────────────────────────────────────────────
if [[ "$CLEAN" == "true" ]]; then
  echo ""
  echo "▸ Cleaning existing compliance data..."
  es_request POST "/$FINDINGS_DS/_delete_by_query?conflicts=proceed" -d '{"query":{"match_all":{}}}' > /dev/null 2>&1 || true
  es_request POST "/$SCORES_DS/_delete_by_query?conflicts=proceed" -d '{"query":{"match_all":{}}}' > /dev/null 2>&1 || true
  es_request POST "/$LATEST_INDEX/_delete_by_query?conflicts=proceed" -d '{"query":{"match_all":{}}}' > /dev/null 2>&1 || true
  echo "  ✓ Cleaned"
fi

# ── Ensure index templates exist ──────────────────────────────────────────────
echo ""
echo "▸ Checking index templates..."
TMPL_EXISTS=$(es_request GET "/_index_template/endpoint_compliance_findings" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('index_templates') else 'no')" 2>/dev/null || echo "no")
if [[ "$TMPL_EXISTS" != "yes" ]]; then
  echo "  ⚠ Index template 'endpoint_compliance_findings' not found."
  echo "    Start Kibana with endpointComplianceMonitoring enabled first."
  echo "    Attempting to create minimal templates for seeding..."

  # Create minimal data stream templates so bulk indexing works
  es_request PUT "/_index_template/endpoint_compliance_findings" -d '{
    "index_patterns": ["logs-endpoint_compliance.findings-*"],
    "data_stream": {},
    "priority": 500
  }' > /dev/null
  es_request PUT "/_index_template/endpoint_compliance_scores" -d '{
    "index_patterns": ["logs-endpoint_compliance.scores-*"],
    "data_stream": {},
    "priority": 500
  }' > /dev/null
  echo "  ✓ Created minimal index templates"
else
  echo "  ✓ Index templates present"
fi

# ── Define sample fleet ──────────────────────────────────────────────────────
# Realistic host names, IDs, and OS metadata

declare -a HOST_IDS HOST_NAMES HOST_OS_NAMES HOST_OS_VERSIONS HOST_PLATFORMS AGENT_IDS

MACOS_NAMES=("patryk-mbp" "eng-mac-01" "design-mac-02" "devops-mac-03" "qa-mac-04")
MACOS_VERSIONS=("14.0" "14.2.1" "15.0" "13.6.4" "14.1")
WIN_NAMES=("win-desktop-01" "win-laptop-02" "exec-win-03" "finance-win-04" "hr-win-05")
WIN_VERSIONS=("10.0.19045" "10.0.22631" "10.0.22621" "11.0.22631" "10.0.19044")
LINUX_NAMES=("prod-ubuntu-01" "staging-debian-02" "ci-runner-03" "monitoring-04" "bastion-05")
LINUX_VERSIONS=("22.04" "12.6" "20.04" "24.04" "11.8")

idx=0
for i in $(seq 1 "$NUM_HOSTS"); do
  mod=$((i % 3))
  arr_idx=$(( (i - 1) / 3 % 5 ))

  if [[ $mod -eq 1 ]]; then
    HOST_PLATFORMS[$idx]="darwin"
    HOST_NAMES[$idx]="${MACOS_NAMES[$arr_idx]}"
    HOST_OS_NAMES[$idx]="macOS"
    HOST_OS_VERSIONS[$idx]="${MACOS_VERSIONS[$arr_idx]}"
  elif [[ $mod -eq 2 ]]; then
    HOST_PLATFORMS[$idx]="windows"
    HOST_NAMES[$idx]="${WIN_NAMES[$arr_idx]}"
    HOST_OS_NAMES[$idx]="Windows"
    HOST_OS_VERSIONS[$idx]="${WIN_VERSIONS[$arr_idx]}"
  else
    HOST_PLATFORMS[$idx]="linux"
    HOST_NAMES[$idx]="${LINUX_NAMES[$arr_idx]}"
    HOST_OS_NAMES[$idx]="Ubuntu"
    HOST_OS_VERSIONS[$idx]="${LINUX_VERSIONS[$arr_idx]}"
  fi

  HOST_IDS[$idx]="host-$(printf '%04d' "$i")-$(openssl rand -hex 4)"
  AGENT_IDS[$idx]="agent-$(printf '%04d' "$i")-$(openssl rand -hex 4)"
  idx=$((idx + 1))
done

echo ""
echo "▸ Generated $NUM_HOSTS sample hosts:"
for i in $(seq 0 $((NUM_HOSTS - 1))); do
  echo "    ${HOST_NAMES[$i]} (${HOST_PLATFORMS[$i]}) — ${HOST_OS_NAMES[$i]} ${HOST_OS_VERSIONS[$i]}"
done

# ── Define rules per benchmark ────────────────────────────────────────────────
# Subset of prebuilt rules — one per section to get good dashboard coverage

# Format: rule_id|name|section|benchmark_id|benchmark_name|benchmark_version|level
MACOS_RULES=(
  "cis_macos_15_2_1_1|Ensure FileVault Is Enabled|2 Storage|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_2_2_1|Ensure Firewall Is Enabled|2 Network|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_1_1|Ensure All Software Is Current|1 Updates|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_5_8|Ensure Screen Saver Timeout ≤5m|5 User Accounts|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_5_2_1|Ensure SSH Root Login Disabled|5 User Accounts|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_2_3_1|Ensure Remote Login Disabled|2 Network|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_2_4_1|Ensure AirDrop Disabled|2 Network|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_6_1_3|Ensure Guest Account Disabled|6 User Accounts|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_2_5_1|Ensure Bluetooth Non-Discoverable|2 Network|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
  "cis_macos_15_5_1_1|Ensure SIP Is Enabled|5 Security|cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0|1"
)

WIN_RULES=(
  "cis_win_11_18_9_11|Ensure BitLocker Enabled|18 Administrative Templates|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_9_1_1|Ensure Firewall Enabled (Domain)|9 Firewall|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_18_4_1|Ensure SMBv1 Disabled|18 Administrative Templates|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_2_3_10_5|Ensure No LM Hash Stored|2 Account Policies|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_2_3_1_1|Ensure Admin Account Renamed|2 Account Policies|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_1_1_1|Ensure Password History ≥24|1 Password Policy|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_18_5_14_1|Ensure WDigest Disabled|18 Administrative Templates|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_18_10_12_1|Ensure Telemetry Limited|18 Administrative Templates|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_2_3_7_5|Ensure UAC Enabled|2 Account Policies|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
  "cis_win_11_17_5_1|Ensure Audit Logon Events|17 Audit Policies|cis_windows_11|CIS Windows 11 Enterprise|v3.0.0|1"
)

LINUX_RULES=(
  "cis_ubuntu_22_1_1_1|Ensure /tmp Separate Partition|1 Filesystem|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_3_4_1_1|Ensure UFW Installed|3 Network|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_5_2_4|Ensure SSH MaxAuthTries ≤4|5 Access Control|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_5_2_1|Ensure SSH Protocol 2|5 Access Control|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_4_2_1|Ensure Password Hashing SHA-512|4 Authentication|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_1_8_1|Ensure AIDE Installed|1 Filesystem|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_5_4_1|Ensure Password Expiry ≤365d|5 Access Control|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_6_1_2|Ensure /etc/passwd Perms|6 Maintenance|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_3_1_1|Ensure IP Forwarding Disabled|3 Network|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
  "cis_ubuntu_22_2_2_1|Ensure NTP Synchronized|2 Services|cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0|1"
)

# ── Generate findings ─────────────────────────────────────────────────────────
echo ""
echo "▸ Generating compliance findings..."

NDJSON=""
FINDING_COUNT=0
NOW_EPOCH=$(date +%s)

for day_offset in $(seq 0 $((NUM_DAYS - 1))); do
  for eval_hour in 0 6 12 18; do
    # Start of the day (midnight UTC), then add eval_hour offset
    DAY_START=$(( NOW_EPOCH - (NOW_EPOCH % 86400) - (day_offset * 86400) ))
    EVAL_EPOCH=$(( DAY_START + (eval_hour * 3600) ))
    # Skip if this would be in the future
    [[ $EVAL_EPOCH -gt $NOW_EPOCH ]] && continue
    EVAL_TS=$(date -u -r "$EVAL_EPOCH" "+%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "@$EVAL_EPOCH" "+%Y-%m-%dT%H:%M:%S.000Z")

    for host_idx in $(seq 0 $((NUM_HOSTS - 1))); do
      platform="${HOST_PLATFORMS[$host_idx]}"
      host_id="${HOST_IDS[$host_idx]}"
      host_name="${HOST_NAMES[$host_idx]}"
      os_name="${HOST_OS_NAMES[$host_idx]}"
      os_version="${HOST_OS_VERSIONS[$host_idx]}"
      agent_id="${AGENT_IDS[$host_idx]}"

      # Select rules for this host's platform
      case "$platform" in
        darwin)  RULES=("${MACOS_RULES[@]}") ;;
        windows) RULES=("${WIN_RULES[@]}") ;;
        linux)   RULES=("${LINUX_RULES[@]}") ;;
      esac

      for rule_def in "${RULES[@]}"; do
        IFS='|' read -r rule_id rule_name section benchmark_id benchmark_name benchmark_version level <<< "$rule_def"

        # Deterministic pass/fail based on host+rule — some hosts are "worse"
        hash_input="${host_id}${rule_id}"
        # Cross-platform hash (works on both macOS and Linux)
        if command -v md5sum &>/dev/null; then
          hash_val=$(echo -n "$hash_input" | md5sum | cut -c1-4)
        else
          hash_val=$(echo -n "$hash_input" | md5 | cut -c1-4)
        fi
        hash_num=$((16#$hash_val))
        rand_pct=$((hash_num % 100))

        # ~70% pass, ~25% fail, ~5% not_applicable (varied by host)
        host_health=$(( (host_idx * 17 + 13) % 30 ))
        pass_threshold=$((65 + host_health / 3))

        if [[ $rand_pct -lt $pass_threshold ]]; then
          evaluation="passed"
          evidence='{"row_count": 1}'
        elif [[ $rand_pct -lt 95 ]]; then
          evaluation="failed"
          evidence='{"row_count": 0, "expected": "at least 1 row"}'
        else
          evaluation="not_applicable"
          evidence='{"error": "table not found on this OS version"}'
        fi

        # Extract rule_number from rule_id (last segment after last _)
        rule_number="${rule_id##*_}"
        # Use section as-is for rule_number (from the prebuilt rules pattern)

        NDJSON+='{"create":{"_index":"'"$FINDINGS_DS"'"}}'$'\n'
        NDJSON+='{
  "@timestamp": "'"$EVAL_TS"'",
  "result": {"evaluation": "'"$evaluation"'", "evidence": '"$evidence"'},
  "rule": {
    "id": "'"$rule_id"'",
    "name": "'"$rule_name"'",
    "description": "'"$rule_name"'",
    "remediation": "See CIS Benchmark documentation.",
    "benchmark": {"id": "'"$benchmark_id"'", "name": "'"$benchmark_name"'", "version": "'"$benchmark_version"'", "posture_type": "endpoint", "rule_number": "'"$section"'"},
    "section": "'"$section"'",
    "level": '"$level"',
    "frameworks": [{"id": "nist_800_53", "version": "r5", "control": "CM-6"}],
    "tags": ["'"$benchmark_id"'", "'"$platform"'", "CIS_Level1"]
  },
  "host": {
    "id": "'"$host_id"'",
    "name": "'"$host_name"'",
    "os": {"family": "'"$platform"'", "name": "'"$os_name"'", "version": "'"$os_version"'", "platform": "'"$platform"'"}
  },
  "agent": {"id": "'"$agent_id"'", "type": "osquery", "version": "5.12.1"},
  "resource": {"type": "system", "sub_type": "'"$section"'"},
  "data_stream": {"dataset": "endpoint_compliance.findings", "namespace": "default", "type": "logs"}
}'$'\n'
        FINDING_COUNT=$((FINDING_COUNT + 1))

        # Flush every 500 docs to avoid huge request bodies
        if [[ $FINDING_COUNT -gt 0 && $((FINDING_COUNT % 500)) -eq 0 ]]; then
          RESULT=$(echo "$NDJSON" | es_request POST "/_bulk" -d @-)
          ERRORS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', True))" 2>/dev/null || echo "true")
          if [[ "$ERRORS" == "True" || "$ERRORS" == "true" ]]; then
            echo "  ⚠ Some bulk errors at doc $FINDING_COUNT (may be benign)"
          fi
          NDJSON=""
          echo "    ...indexed $FINDING_COUNT findings so far"
        fi
      done
    done
  done
done

# Flush remaining
if [[ -n "$NDJSON" ]]; then
  RESULT=$(echo "$NDJSON" | es_request POST "/_bulk" -d @-)
  ERRORS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', True))" 2>/dev/null || echo "true")
  if [[ "$ERRORS" == "True" || "$ERRORS" == "true" ]]; then
    echo "  ⚠ Some bulk errors in final batch"
  fi
fi
echo "  ✓ Indexed $FINDING_COUNT findings into $FINDINGS_DS"

# ── Generate score history ────────────────────────────────────────────────────
echo ""
echo "▸ Generating compliance score history..."

NDJSON=""
SCORE_COUNT=0

BENCHMARKS=(
  "cis_macos_15|CIS macOS 15.0 Sequoia|v1.0.0"
  "cis_windows_11|CIS Windows 11 Enterprise|v3.0.0"
  "cis_ubuntu_22|CIS Ubuntu Linux 22.04 LTS|v2.0.0"
)

for day_offset in $(seq 0 $((NUM_DAYS - 1))); do
  for hour in $(seq 0 5 23); do
    SCORE_EPOCH=$(( NOW_EPOCH - (day_offset * 86400) + (hour * 3600) ))
    SCORE_TS=$(date -u -r "$SCORE_EPOCH" "+%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "@$SCORE_EPOCH" "+%Y-%m-%dT%H:%M:%S.000Z")

    for bm_def in "${BENCHMARKS[@]}"; do
      IFS='|' read -r bm_id bm_name bm_version <<< "$bm_def"

      # Simulate gradual improvement over time
      # Scores improve over time: lower in the past, higher today
      base_score=$((78 - day_offset * 3))
      jitter=$(( (RANDOM % 8) - 4 ))
      score=$(( base_score + jitter ))
      [[ $score -gt 100 ]] && score=100
      [[ $score -lt 0 ]] && score=0

      total=$((30 * NUM_HOSTS / 3))
      passed=$(( total * score / 100 ))
      failed=$(( total - passed - (RANDOM % 3) ))
      [[ $failed -lt 0 ]] && failed=0
      na=$(( total - passed - failed ))
      [[ $na -lt 0 ]] && na=0

      host_count=$(( NUM_HOSTS / 3 + (NUM_HOSTS % 3 > 0 ? 1 : 0) ))

      NDJSON+='{"create":{"_index":"'"$SCORES_DS"'"}}'$'\n'
      NDJSON+='{
  "@timestamp": "'"$SCORE_TS"'",
  "score": '"$score"',
  "total_findings": '"$total"',
  "passed_findings": '"$passed"',
  "failed_findings": '"$failed"',
  "not_applicable_findings": '"$na"',
  "rule": {"benchmark": {"id": "'"$bm_id"'", "name": "'"$bm_name"'", "version": "'"$bm_version"'"}},
  "policy_template": "endpoint_compliance",
  "host_count": '"$host_count"',
  "is_enabled_rules_score": true,
  "namespace": "default"
}'$'\n'
      SCORE_COUNT=$((SCORE_COUNT + 1))
    done
  done
done

if [[ -n "$NDJSON" ]]; then
  RESULT=$(echo "$NDJSON" | es_request POST "/_bulk" -d @-)
  ERRORS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', True))" 2>/dev/null || echo "true")
  if [[ "$ERRORS" == "True" || "$ERRORS" == "true" ]]; then
    echo "  ⚠ Some bulk errors in scores batch"
  fi
fi
echo "  ✓ Indexed $SCORE_COUNT score snapshots into $SCORES_DS"

# ── Refresh indices ───────────────────────────────────────────────────────────
echo ""
echo "▸ Refreshing indices..."
es_request POST "/$FINDINGS_DS/_refresh" > /dev/null 2>&1 || true
es_request POST "/$SCORES_DS/_refresh" > /dev/null 2>&1 || true
es_request POST "/$LATEST_INDEX/_refresh" > /dev/null 2>&1 || true
echo "  ✓ Refreshed"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "▸ Verifying data..."
FINDINGS_COUNT=$(es_request GET "/$FINDINGS_DS/_count" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")
SCORES_COUNT=$(es_request GET "/$SCORES_DS/_count" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")
LATEST_COUNT=$(es_request GET "/$LATEST_INDEX/_count" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✅ Seeding complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo " Data summary:"
echo "   Findings (data stream):  $FINDINGS_COUNT docs"
echo "   Scores (data stream):    $SCORES_COUNT docs"
echo "   Findings (latest):       $LATEST_COUNT docs (transform — may take ~60s to populate)"
echo ""
echo " Hosts:      $NUM_HOSTS across macOS / Windows / Linux"
echo " Benchmarks: CIS macOS 15 / CIS Windows 11 / CIS Ubuntu 22.04"
echo " History:    $NUM_DAYS days, evaluations every 6 hours"
echo ""
echo " Next steps:"
echo "   1. Start Kibana with: xpack.osquery.experimentalFeatures.endpointComplianceMonitoring: true"
echo "   2. Navigate to: Management > Osquery > Compliance"
echo "   3. Dashboard shows score gauge, trend chart, sections, and worst hosts"
echo "   4. Findings page shows individual check results per host"
echo "   5. Rules page shows the 30 prebuilt CIS rules"
echo ""
echo " To re-seed with fresh data:"
echo "   $0 --clean --hosts $NUM_HOSTS --days $NUM_DAYS"
echo ""
