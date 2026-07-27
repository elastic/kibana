#!/usr/bin/env bash
# Gathers diagnostic information about a Fleet test file.
# Shows: skip status, linked GitHub issues, FTR config files, git history,
# skip/unskip history, sibling open issues, staleness signal, test count.
#
# Usage (from kibana repo root):
#   bash x-pack/platform/plugins/shared/fleet/.agents/skills/fleet-flaky-test-doctor/scripts/check_fleet_test_status.sh \
#     x-pack/platform/test/fleet_api_integration/apis/epm/knowledge_base.ts
#
# Requires: git, gh (GitHub CLI, authenticated)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <test-file>"
  exit 1
fi

TEST_FILE="$1"
BASENAME="$(basename "$TEST_FILE" .ts)"

echo "=== Fleet Flaky Test Doctor: Diagnostic Report ==="
echo "File: $TEST_FILE"
echo "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# --- Skip Status ---
echo "--- Skip Status ---"
if grep -nE '\.skip\s*\(|describe\.skip|it\.skip|test\.skip|@skipIn' "$TEST_FILE" 2>/dev/null; then
  echo "  STATUS: SKIPPED (see matches above)"
else
  echo "  STATUS: Active (no skip directives found)"
fi
echo ""

# --- Linked GitHub Issues ---
echo "--- Linked GitHub Issues ---"
ISSUES=$(grep -oE 'https://github\.com/elastic/kibana/issues/[0-9]+' "$TEST_FILE" 2>/dev/null | sort -u || true)
if [[ -n "$ISSUES" ]]; then
  echo "$ISSUES"
else
  echo "  No GitHub issue links found in test file"
fi
echo ""

# --- Test Type & FTR Config Files ---
echo "--- Test Type & FTR Config Files ---"
if echo "$TEST_FILE" | grep -q "fleet_api_integration"; then
  echo "  Type: FTR API integration"
  echo "  Config files that reference this test:"
  grep -rl "$BASENAME" x-pack/platform/test/fleet_api_integration/config.*.ts 2>/dev/null \
    | sed 's/^/    /' \
    || echo "    (none found — check if the test is loaded via a wildcard pattern)"
  grep -rl "$BASENAME" x-pack/solutions/security/test/fleet_api_integration/config.*.ts 2>/dev/null \
    | sed 's/^/    (security mirror) /' || true
elif echo "$TEST_FILE" | grep -q "server/integration_tests"; then
  echo "  Type: Jest server integration"
  echo "  Run: node scripts/jest_integration --testPathPattern='$TEST_FILE'"
elif echo "$TEST_FILE" | grep -q "test/scout"; then
  echo "  Type: Scout Playwright"
  echo "  Run: Scout runner (see fleet-ftr-testing skill for Scout equivalent)"
elif echo "$TEST_FILE" | grep -q "fleet_tasks"; then
  echo "  Type: Fleet tasks FTR"
  grep -rl "$BASENAME" x-pack/platform/test/fleet_tasks/ 2>/dev/null \
    | sed 's/^/    /' || echo "    (no config found)"
else
  echo "  Type: Jest unit"
  echo "  Run: yarn jest '$TEST_FILE'"
fi
echo ""

# --- Recent Git History ---
echo "--- Recent Git History (last 10 commits) ---"
git log --oneline -10 -- "$TEST_FILE" 2>/dev/null || echo "  No git history"
echo ""

# --- Skip/Unskip Changes ---
echo "--- Skip/Unskip Changes ---"
git log --oneline -10 -S '.skip' -- "$TEST_FILE" 2>/dev/null || echo "  No skip changes found"
echo ""

# --- Staleness Signal ---
echo "--- Staleness Signal ---"
LAST_COMMIT_DATE=$(git log -1 --format="%ai" -- "$TEST_FILE" 2>/dev/null || echo "unknown")
echo "  Last commit to test file: $LAST_COMMIT_DATE"
if [[ "$LAST_COMMIT_DATE" != "unknown" ]]; then
  DAYS_AGO=$(( ( $(date -u +%s) - $(date -d "$LAST_COMMIT_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S %z" "$LAST_COMMIT_DATE" +%s 2>/dev/null || echo 0) ) / 86400 ))
  echo "  (~$DAYS_AGO days ago)"
  if [[ $DAYS_AGO -gt 90 ]]; then
    echo "  ⚠️  File unchanged for >90 days — close-stale or flaky-rerun candidate"
  fi
fi
echo ""

# --- Merged PRs That Touched This File ---
echo "--- Recent Merged PRs Touching This File ---"
gh pr list --repo elastic/kibana \
  --search "$BASENAME in:title" \
  --state merged \
  --limit 5 \
  --json number,title,mergedAt \
  --jq '.[] | "#\(.number) (\(.mergedAt[:10])) \(.title)"' 2>/dev/null \
  | sed 's/^/  /' \
  || echo "  (gh CLI unavailable or no results)"
echo ""

# --- Sibling Open Issues (cluster detection) ---
echo "--- Sibling Open Issues (same test file) ---"
gh issue list --repo elastic/kibana \
  --label "Team:Fleet" \
  --label "failed-test" \
  --state open \
  --search "$BASENAME" \
  --limit 20 \
  --json number,title \
  --jq '.[] | "#\(.number) \(.title)"' 2>/dev/null \
  | sed 's/^/  /' \
  || echo "  (gh CLI unavailable or no results)"
echo ""

# --- Test Summary ---
echo "--- Test Summary ---"
IT_COUNT=$(grep -cE '^\s*it\s*\(' "$TEST_FILE" 2>/dev/null || echo "0")
DESCRIBE_COUNT=$(grep -cE '^\s*describe\s*\(' "$TEST_FILE" 2>/dev/null || echo "0")
SKIP_COUNT=$(grep -cE '\.skip\s*\(|describe\.skip|it\.skip|test\.skip' "$TEST_FILE" 2>/dev/null || echo "0")
LINE_COUNT=$(wc -l < "$TEST_FILE" | tr -d ' ')
echo "  Describe blocks: $DESCRIBE_COUNT"
echo "  Test cases (it): $IT_COUNT"
echo "  Skip directives: $SKIP_COUNT"
echo "  Total lines: $LINE_COUNT"
