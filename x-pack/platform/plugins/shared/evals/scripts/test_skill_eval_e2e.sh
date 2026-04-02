#!/usr/bin/env bash
# E2E validation script for Agent Builder skill evaluation platform
# Usage: ./test_skill_eval_e2e.sh [KIBANA_URL] [CONNECTOR_ID]
#
# Prerequisites:
#   - Kibana running with evals + agent_builder plugins enabled
#   - A valid LLM connector ID (from Stack Management > Connectors)
#   - elastic/changeme credentials (default dev mode)

set -euo pipefail

KIBANA_URL="${1:-http://localhost:5601}"
CONNECTOR_ID="${2:-}"
AUTH="elastic:changeme"
API_VERSION="2023-10-31"
INTERNAL_VERSION="1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0
skip=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1: $2"; ((fail++)); }
log_skip() { echo -e "${YELLOW}[SKIP]${NC} $1"; ((skip++)); }
log_info() { echo -e "       $1"; }

# Helper: call Kibana API
kb_public() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -w '\n%{http_code}' -u "$AUTH" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: $API_VERSION")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}" -X "$method" "${KIBANA_URL}${path}"
}

kb_internal() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -w '\n%{http_code}' -u "$AUTH" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: $INTERNAL_VERSION" \
    -H "X-Elastic-Internal-Origin: kibana")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}" -X "$method" "${KIBANA_URL}${path}"
}

extract_status() { echo "$1" | tail -1; }
extract_body() { echo "$1" | sed '$d'; }

echo "============================================"
echo " Skill Eval Platform — E2E Validation"
echo "============================================"
echo "Kibana: $KIBANA_URL"
echo "Connector: ${CONNECTOR_ID:-<none — LLM tests will be skipped>}"
echo ""

# ── Step 0: Health check ──
echo "── Step 0: Kibana health check ──"
health=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" "${KIBANA_URL}/api/status")
if [[ "$health" == "200" ]]; then
  log_pass "Kibana is running"
else
  echo -e "${RED}Kibana not reachable at ${KIBANA_URL} (HTTP ${health}). Aborting.${NC}"
  exit 1
fi

# ── Step 1: Create dummy Agent Builder skills ──
echo ""
echo "── Step 1: Create dummy Agent Builder skills ──"

SECURITY_SKILL_ID="e2e-test-security-alert-triage"
ESQL_SKILL_ID="e2e-test-esql-query-helper"
OBS_SKILL_ID="e2e-test-obs-log-analysis"

# Security alert triage skill
result=$(kb_public POST "/api/agent_builder/skills" "{
  \"id\": \"${SECURITY_SKILL_ID}\",
  \"name\": \"Security Alert Triage\",
  \"description\": \"Helps SOC analysts triage and investigate security alerts from Elastic SIEM\",
  \"content\": \"# Security Alert Triage\\n\\nYou are a security operations assistant that helps analysts triage alerts.\\n\\n## Steps\\n1. Retrieve the alert details using the alert ID\\n2. Check MITRE ATT&CK technique mappings\\n3. Look for related alerts from the same host or user\\n4. Check threat intelligence for any known IOCs\\n5. Provide a triage recommendation (true positive, false positive, needs investigation)\\n\\n\\\`\\\`\\\`esql\\nFROM .alerts-security.alerts-default\\n| WHERE kibana.alert.workflow_status == \\\"open\\\"\\n| STATS count = COUNT(*) BY host.name\\n| SORT count DESC\\n| LIMIT 10\\n\\\`\\\`\\\`\\n\\nAlways check for lateral movement indicators and C2 beaconing patterns.\",
  \"tool_ids\": []
}")
status=$(extract_status "$result")
body=$(extract_body "$result")
if [[ "$status" == "200" ]]; then
  log_pass "Created security skill: ${SECURITY_SKILL_ID}"
elif [[ "$status" == "409" ]] || echo "$body" | grep -qi "already exists"; then
  log_pass "Security skill already exists: ${SECURITY_SKILL_ID}"
else
  log_fail "Create security skill" "HTTP ${status}: $(echo "$body" | head -c 200)"
fi

# ES|QL query helper skill
result=$(kb_public POST "/api/agent_builder/skills" "{
  \"id\": \"${ESQL_SKILL_ID}\",
  \"name\": \"ESQL Query Helper\",
  \"description\": \"Helps users write and optimize ES|QL queries for data analysis\",
  \"content\": \"# ES|QL Query Helper\\n\\nYou help users write correct ES|QL queries.\\n\\n## Capabilities\\n- Translate natural language to ES|QL\\n- Validate query syntax\\n- Optimize query performance\\n\\n## Examples\\n\\n\\\`\\\`\\\`esql\\nFROM logs-*\\n| WHERE @timestamp > NOW() - 1 hour\\n| STATS avg_duration = AVG(event.duration) BY service.name\\n| SORT avg_duration DESC\\n\\\`\\\`\\\`\\n\\n\\\`\\\`\\\`esql\\nFROM metrics-*\\n| WHERE host.name == \\\"web-server-01\\\"\\n| EVAL cpu_pct = system.cpu.total.pct * 100\\n| STATS max_cpu = MAX(cpu_pct), avg_cpu = AVG(cpu_pct) BY BUCKET(@timestamp, 5 minutes)\\n\\\`\\\`\\\`\\n\\nAlways validate field names against the index mapping before suggesting queries.\",
  \"tool_ids\": []
}")
status=$(extract_status "$result")
body=$(extract_body "$result")
if [[ "$status" == "200" ]]; then
  log_pass "Created ES|QL skill: ${ESQL_SKILL_ID}"
elif [[ "$status" == "409" ]] || echo "$body" | grep -qi "already exists"; then
  log_pass "ES|QL skill already exists: ${ESQL_SKILL_ID}"
else
  log_fail "Create ES|QL skill" "HTTP ${status}: $(echo "$body" | head -c 200)"
fi

# Observability log analysis skill
result=$(kb_public POST "/api/agent_builder/skills" "{
  \"id\": \"${OBS_SKILL_ID}\",
  \"name\": \"Observability Log Analysis\",
  \"description\": \"Analyzes application logs to identify errors, performance issues, and anomalies\",
  \"content\": \"# Observability Log Analysis\\n\\nYou analyze application logs from Elastic Observability.\\n\\n## Steps\\n1. Identify the time range and services of interest\\n2. Search for error patterns and stack traces\\n3. Correlate with metrics (CPU, memory, latency)\\n4. Check for deployment events that might explain changes\\n5. Summarize findings and suggest next steps\\n\\nUse the visualization tools to create dashboards showing error trends and latency distributions.\\n\\nPay attention to:\\n- Error rate spikes\\n- Latency p99 degradation\\n- Memory leak patterns\\n- Connection pool exhaustion\",
  \"tool_ids\": []
}")
status=$(extract_status "$result")
body=$(extract_body "$result")
if [[ "$status" == "200" ]]; then
  log_pass "Created observability skill: ${OBS_SKILL_ID}"
elif [[ "$status" == "409" ]] || echo "$body" | grep -qi "already exists"; then
  log_pass "Observability skill already exists: ${OBS_SKILL_ID}"
else
  log_fail "Create observability skill" "HTTP ${status}: $(echo "$body" | head -c 200)"
fi

# ── Step 2: List skills via evals API ──
echo ""
echo "── Step 2: Verify skills visible via evals API ──"

result=$(kb_internal GET "/internal/evals/skills")
status=$(extract_status "$result")
body=$(extract_body "$result")
if [[ "$status" == "200" ]]; then
  count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total', len(d.get('skills', []))))" 2>/dev/null || echo "?")
  log_pass "List skills: ${count} skills found"
  # Check our test skills are in the list
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    if echo "$body" | grep -q "$sid"; then
      log_info "  Found: ${sid}"
    else
      log_info "  Missing: ${sid} (may be filtered)"
    fi
  done
else
  log_fail "List skills" "HTTP ${status}: $(echo "$body" | head -c 200)"
fi

# ── Step 3: Dataset status (should be empty initially) ──
echo ""
echo "── Step 3: Check dataset status (expect: no dataset) ──"

for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
  result=$(kb_internal GET "/internal/evals/skills/${sid}/dataset-status")
  status=$(extract_status "$result")
  body=$(extract_body "$result")
  if [[ "$status" == "200" ]]; then
    exists=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exists', False))" 2>/dev/null || echo "?")
    if [[ "$exists" == "False" ]]; then
      log_pass "Dataset status for ${sid}: no dataset (expected)"
    else
      count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('examples_count', '?'))" 2>/dev/null || echo "?")
      log_pass "Dataset status for ${sid}: ${count} examples (pre-existing)"
    fi
  else
    log_fail "Dataset status for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
  fi
done

# ── Step 4: Propose evaluators ──
echo ""
echo "── Step 4: Propose evaluators for each skill ──"

if [[ -z "$CONNECTOR_ID" ]]; then
  log_skip "Propose evaluators (no CONNECTOR_ID provided)"
else
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    result=$(kb_internal POST "/internal/evals/skills/${sid}/propose-evaluators" \
      "{\"connector_id\": \"${CONNECTOR_ID}\"}")
    status=$(extract_status "$result")
    body=$(extract_body "$result")
    if [[ "$status" == "200" ]]; then
      total=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', '?'))" 2>/dev/null || echo "?")
      selected=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('selected_count', '?'))" 2>/dev/null || echo "?")
      log_pass "Propose evaluators for ${sid}: ${selected}/${total} selected"
      # Show evaluator names
      names=$(echo "$body" | python3 -c "
import sys,json
d = json.load(sys.stdin)
for e in d.get('proposed_evaluators', []):
    mark = '✓' if e.get('selected') else '○'
    print(f\"  {mark} {e['name']} ({e.get('source', '?')})\")" 2>/dev/null || echo "  (parse error)")
      log_info "$names"
    else
      log_fail "Propose evaluators for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
    fi
  done
fi

# ── Step 5: Generate eval dataset ──
echo ""
echo "── Step 5: Generate eval datasets ──"

if [[ -z "$CONNECTOR_ID" ]]; then
  log_skip "Generate datasets (no CONNECTOR_ID provided)"
else
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    result=$(kb_internal POST "/internal/evals/skills/${sid}/generate-eval-dataset" \
      "{\"connector_id\": \"${CONNECTOR_ID}\", \"count\": 5}")
    status=$(extract_status "$result")
    body=$(extract_body "$result")
    if [[ "$status" == "200" ]]; then
      total=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', '?'))" 2>/dev/null || echo "?")
      log_pass "Generated dataset for ${sid}: ${total} test cases"
    else
      log_fail "Generate dataset for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
    fi
  done
fi

# ── Step 6: Verify dataset status after generation ──
echo ""
echo "── Step 6: Verify dataset status after generation ──"

if [[ -z "$CONNECTOR_ID" ]]; then
  log_skip "Verify datasets (no CONNECTOR_ID — datasets not generated)"
else
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    result=$(kb_internal GET "/internal/evals/skills/${sid}/dataset-status")
    status=$(extract_status "$result")
    body=$(extract_body "$result")
    if [[ "$status" == "200" ]]; then
      exists=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exists', False))" 2>/dev/null || echo "?")
      count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('examples_count', 0))" 2>/dev/null || echo "?")
      if [[ "$exists" == "True" && "$count" -gt 0 ]]; then
        log_pass "Dataset verified for ${sid}: ${count} examples"
      else
        log_fail "Dataset for ${sid}" "exists=${exists}, count=${count}"
      fi
    else
      log_fail "Verify dataset for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
    fi
  done
fi

# ── Step 7: Run online eval ──
echo ""
echo "── Step 7: Run online eval ──"

if [[ -z "$CONNECTOR_ID" ]]; then
  log_skip "Run online eval (no CONNECTOR_ID provided)"
else
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    result=$(kb_internal POST "/internal/evals/skills/${sid}/run-online-eval" \
      "{\"connector_id\": \"${CONNECTOR_ID}\"}")
    status=$(extract_status "$result")
    body=$(extract_body "$result")
    if [[ "$status" == "200" ]]; then
      eval_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status', '?'))" 2>/dev/null || echo "?")
      evals_count=$(echo "$body" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('evaluators', [])))" 2>/dev/null || echo "?")
      log_pass "Online eval for ${sid}: status=${eval_status}, evaluators=${evals_count}"
    else
      log_fail "Run online eval for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
    fi
  done
fi

# ── Step 7.5: Harvest failures ──
echo ""
echo "── Step 7.5: Harvest failures ──"

if [[ -z "$CONNECTOR_ID" ]]; then
  log_skip "Harvest failures (no CONNECTOR_ID — no eval run to harvest from)"
else
  for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
    result=$(kb_internal POST "/internal/evals/skills/${sid}/harvest-failures" \
      '{"min_count": 1, "time_range": "1h"}')
    status=$(extract_status "$result")
    body=$(extract_body "$result")
    if [[ "$status" == "200" ]]; then
      harvested=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('harvested_count', 0))" 2>/dev/null || echo "?")
      new_examples=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('new_examples_created', 0))" 2>/dev/null || echo "?")
      patterns=$(echo "$body" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failure_patterns', [])))" 2>/dev/null || echo "?")
      log_pass "Harvest for ${sid}: ${harvested} harvested, ${new_examples} new examples, ${patterns} patterns"
    else
      log_fail "Harvest failures for ${sid}" "HTTP ${status}: $(echo "$body" | head -c 200)"
    fi
  done
fi

# ── Step 7.6: List suites ──
echo ""
echo "── Step 7.6: List @kbn/evals suites ──"

result=$(kb_internal GET "/internal/evals/suites")
status=$(extract_status "$result")
body=$(extract_body "$result")
if [[ "$status" == "200" ]]; then
  suite_count=$(echo "$body" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('suites', [])))" 2>/dev/null || echo "?")
  log_pass "List suites: ${suite_count} suites found"
  if [[ "$suite_count" != "0" ]]; then
    names=$(echo "$body" | python3 -c "
import sys,json
for s in json.load(sys.stdin).get('suites', []):
    print(f\"  - {s['name']} ({s['id']})\")" 2>/dev/null || echo "  (parse error)")
    log_info "$names"
  fi
else
  log_fail "List suites" "HTTP ${status}: $(echo "$body" | head -c 200)"
fi

# ── Step 7.7: Suite status check ──
echo ""
echo "── Step 7.7: Suite status check ──"

# Use the first suite from the list, or a fallback ID
first_suite_id=$(echo "$body" | python3 -c "import sys,json; suites=json.load(sys.stdin).get('suites',[]); print(suites[0]['id'] if suites else '')" 2>/dev/null || echo "")
if [[ -n "$first_suite_id" ]]; then
  result=$(kb_internal GET "/internal/evals/suites/${first_suite_id}/status")
  status=$(extract_status "$result")
  body=$(extract_body "$result")
  if [[ "$status" == "200" ]]; then
    suite_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status', '?'))" 2>/dev/null || echo "?")
    log_pass "Suite status for ${first_suite_id}: ${suite_status}"
  else
    log_fail "Suite status for ${first_suite_id}" "HTTP ${status}: $(echo "$body" | head -c 200)"
  fi
else
  log_skip "Suite status (no suites found to check)"
fi

# ── Step 8: Cleanup (optional) ──
echo ""
echo "── Step 8: Cleanup test skills ──"

for sid in "$SECURITY_SKILL_ID" "$ESQL_SKILL_ID" "$OBS_SKILL_ID"; do
  result=$(kb_public DELETE "/api/agent_builder/skills/${sid}")
  status=$(extract_status "$result")
  if [[ "$status" == "200" || "$status" == "204" ]]; then
    log_pass "Deleted skill: ${sid}"
  elif [[ "$status" == "404" ]]; then
    log_pass "Skill already gone: ${sid}"
  else
    log_fail "Delete skill ${sid}" "HTTP ${status}"
  fi
done

# ── Summary ──
echo ""
echo "============================================"
echo " Results: ${pass} passed, ${fail} failed, ${skip} skipped"
echo "============================================"

exit $fail
