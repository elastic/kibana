#!/usr/bin/env bash
# Sets up test connectors for alerting_v2 demos.
#
# Usage:
#   ./x-pack/platform/plugins/shared/alerting_v2/scripts/setup_demo_connectors.sh
#
# Prerequisites:
#   - Kibana running locally (auto-detected)
#   - For Slack: set SLACK_WEBHOOK_URL in your environment
#
# What it creates:
#   1. Slack Webhook connector (if SLACK_WEBHOOK_URL is set)
#   2. Server Log connector (always — no external deps)
#   3. Index connector (always — writes to a local index)
#
# The script is idempotent: it checks for existing connectors by name
# before creating new ones.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Auto-detect port from kibana.dev.yml if KIBANA_URL isn't already set
if [[ -z "${KIBANA_URL:-}" ]]; then
  _dev_yml="$REPO_ROOT/config/kibana.dev.yml"
  if [[ -f "$_dev_yml" ]]; then
    _port="$(grep -E '^\s*server\.port:' "$_dev_yml" | awk '{print $2}' | tr -d '[:space:]')"
    if [[ -n "$_port" ]]; then
      export KIBANA_URL="http://localhost:${_port}"
    fi
  fi
fi

source "$REPO_ROOT/scripts/kibana_api_common.sh"

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

create_connector_if_missing() {
  local name="$1"
  local payload="$2"

  local existing
  existing="$(kibana_curl -X GET "$KIBANA_URL/api/actions/connectors" \
    -H "Content-Type: application/json" 2>/dev/null)"

  if echo "$existing" | grep -q "\"name\":\"${name}\""; then
    echo "  ✓ Connector '${name}' already exists — skipping"
    return 0
  fi

  local response
  response="$(kibana_curl -X POST "$KIBANA_URL/api/actions/connector" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null)"

  local id
  id="$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)"

  if [[ -n "$id" ]]; then
    echo "  ✓ Created connector '${name}' (id: ${id})"
  else
    echo "  ✗ Failed to create connector '${name}'"
    echo "    Response: $response"
    return 1
  fi
}

echo ""
echo "=== Alerting v2 Demo Connector Setup ==="
echo ""

# 1. Server Log connector (no external dependencies)
echo "[1/3] Server Log connector"
create_connector_if_missing "Demo: Server Log" '{
  "connector_type_id": ".server-log",
  "name": "Demo: Server Log",
  "config": {},
  "secrets": {}
}'

# 2. Index connector (writes to a local index)
echo "[2/3] Index connector"
create_connector_if_missing "Demo: Alert Index" '{
  "connector_type_id": ".index",
  "name": "Demo: Alert Index",
  "config": {
    "index": "demo-alerting-v2-alerts",
    "executionTimeField": "@timestamp"
  },
  "secrets": {}
}'

# 3. Slack Webhook connector
echo "[3/3] Slack Webhook connector"
if [[ -z "$SLACK_WEBHOOK_URL" ]]; then
  echo "  ⊘ SLACK_WEBHOOK_URL not set — skipping"
  echo "    To create: export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...' and re-run"
else
  create_connector_if_missing "Ops Notifications (#alerts)" "{
    \"connector_type_id\": \".slack\",
    \"name\": \"Ops Notifications (#alerts)\",
    \"config\": {},
    \"secrets\": {
      \"webhookUrl\": \"${SLACK_WEBHOOK_URL}\"
    }
  }"
fi

echo ""
echo "=== Done ==="
echo ""
echo "Connectors available at: ${KIBANA_URL}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors"
echo ""
