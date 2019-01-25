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

source src/dev/ci_setup/checkout_sibling_es.sh

export TEST_BROWSER_HEADLESS=1

echo " -> Skipping Running mocha tests (for secops only)"
cd "$XPACK_DIR"
# yarn test
echo ""
echo ""


echo " -> Running jest tests (for secops only)"
cd "$XPACK_DIR"
node scripts/jest --ci --no-cache --verbose secops
echo ""
echo ""
