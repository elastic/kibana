#!/usr/bin/env bash

set -e

function report {
  if [[ -z "$PR_SOURCE_BRANCH" ]]; then
    cd "$KIBANA_DIR"
    node src/dev/failed_tests/cli
  else
    echo "Failure issues not created on pull requests"
  fi
}

trap report EXIT

export TEST_BROWSER_HEADLESS=1

echo " -> Skipping Running mocha tests (for siem only)"
cd "$XPACK_DIR"
# yarn test
echo ""
echo ""


echo " -> Running jest tests (for siem only)"
cd "$XPACK_DIR"
node scripts/jest --ci --no-cache --verbose siem
echo ""
echo ""

# echo " -> Running jest integration tests"
# cd "$XPACK_DIR"
# node scripts/jest_integration --ci --no-cache --verbose
# echo ""
# echo ""
