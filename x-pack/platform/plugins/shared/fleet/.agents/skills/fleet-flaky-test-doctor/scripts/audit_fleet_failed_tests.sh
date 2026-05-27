#!/usr/bin/env bash
# Mode 2 orchestrator: fetches all open Team:Fleet failed-test issues and
# produces a quick-skim tracking table for use with fleet-flaky-test-doctor.
#
# This script is the data-gathering step. Feed its output to Claude with the
# fleet-flaky-test-doctor skill (Mode 2) to get verdicts and cluster groupings.
#
# Usage (from kibana repo root):
#   bash x-pack/platform/plugins/shared/fleet/.agents/skills/fleet-flaky-test-doctor/scripts/audit_fleet_failed_tests.sh
#
# Output: markdown table written to stdout (redirect to a file if preferred).
# Requires: gh (GitHub CLI, authenticated), git

set -euo pipefail

REPO="elastic/kibana"

echo "# Fleet Failed-Test Audit — $(date -u '+%Y-%m-%d')"
echo ""
echo "Source: https://github.com/elastic/kibana/issues?q=is%3Aissue+state%3Aopen+label%3ATeam%3AFleet+label%3Afailed-test"
echo ""

# Fetch all open issues
ISSUES_JSON=$(gh issue list \
  --repo "$REPO" \
  --label "Team:Fleet" \
  --label "failed-test" \
  --state open \
  --limit 200 \
  --json number,title,createdAt,updatedAt,labels)

TOTAL=$(echo "$ISSUES_JSON" | jq 'length')
echo "**Total open issues: $TOTAL**"
echo ""

echo "| # | Title (short) | Test type | File exists? | Last file commit | Days stale | Quick notes |"
echo "|---|---|---|---|---|---|---|"

echo "$ISSUES_JSON" | jq -c '.[]' | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  UPDATED=$(echo "$issue" | jq -r '.updatedAt[:10]')

  # Extract test path from standard Kibana auto-reporter title format:
  # "Failing test: <Pipeline>.<path> - <describe> <test name>"
  # Path is between the first '.' after "Failing test: " and the " - "
  TEST_PATH=$(echo "$TITLE" \
    | sed -E 's/^Failing test: [^.]+\.//' \
    | sed -E 's/ - .*//' \
    | sed -E 's/·ts$/.ts/' \
    | sed -E 's/·tsx$/.tsx/' \
    | tr -d ' ' \
    || true)

  # Determine test type from path
  if echo "$TEST_PATH" | grep -q "fleet_api_integration"; then
    TYPE="FTR API"
  elif echo "$TEST_PATH" | grep -q "server/integration_tests"; then
    TYPE="Jest server int."
  elif echo "$TEST_PATH" | grep -q "test/scout"; then
    TYPE="Scout"
  elif echo "$TEST_PATH" | grep -q "fleet_tasks"; then
    TYPE="Fleet tasks FTR"
  elif echo "$TEST_PATH" | grep -q "\.test\.ts"; then
    TYPE="Jest unit"
  else
    TYPE="?"
  fi

  # Check if file exists
  if [[ -n "$TEST_PATH" ]] && [[ -f "$TEST_PATH" ]]; then
    EXISTS="✅"
    LAST_COMMIT=$(git log -1 --format="%as" -- "$TEST_PATH" 2>/dev/null || echo "?")
    if [[ "$LAST_COMMIT" != "?" ]]; then
      DAYS=$(( ( $(date -u +%s) - $(date -d "$LAST_COMMIT" +%s 2>/dev/null || echo 0) ) / 86400 ))
      STALE="${DAYS}d"
    else
      STALE="?"
    fi
  elif [[ -n "$TEST_PATH" ]]; then
    EXISTS="❌ not found"
    LAST_COMMIT="—"
    STALE="—"
  else
    EXISTS="? (path unresolved)"
    LAST_COMMIT="—"
    STALE="—"
  fi

  # Labels
  IS_BLOCKER=$(echo "$issue" | jq -r '[.labels[].name] | map(select(. == "blocker")) | length > 0')
  IS_SKIPPED=$(echo "$issue" | jq -r '[.labels[].name] | map(select(. == "skipped-test")) | length > 0')
  NOTES=""
  [[ "$IS_BLOCKER" == "true" ]] && NOTES="${NOTES}🔴blocker "
  [[ "$IS_SKIPPED" == "true" ]] && NOTES="${NOTES}⏭skipped "
  [[ "$EXISTS" == "❌ not found" ]] && NOTES="${NOTES}→ close-stale?"

  SHORT_TITLE=$(echo "$TITLE" | sed 's/^Failing test: //' | sed 's/^Skipped test: //' | cut -c1-80)

  echo "| [#${NUMBER}](https://github.com/${REPO}/issues/${NUMBER}) | ${SHORT_TITLE} | ${TYPE} | ${EXISTS} | ${LAST_COMMIT} | ${STALE} | ${NOTES} |"
done

echo ""
echo "---"
echo ""
echo "## Next step"
echo ""
echo "Feed this output to Claude with the fleet-flaky-test-doctor skill (Mode 2) to get:"
echo "- Per-issue verdicts (close-stale / flaky-rerun / fix / delete-test / escalate)"
echo "- Cluster groupings and shared-cause hypotheses"
echo "- Lane assignments for the burn-down (batch close / batch rerun / Mode 3 / handoff)"
