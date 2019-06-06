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

echo " -> Ensuring all functional tests are in a ciGroup"
cd "$XPACK_DIR"
node scripts/functional_tests --assert-none-excluded \
  --include-tag ciGroup1 \
  --include-tag ciGroup2 \
  --include-tag ciGroup3 \
  --include-tag ciGroup4 \
  --include-tag ciGroup5 \
  --include-tag ciGroup6 \
  --include-tag ciGroup7 \
  --include-tag ciGroup8 \
  --include-tag ciGroup9 \
  --include-tag ciGroup10

echo " -> Running functional and api tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" node scripts/functional_tests --debug --bail --include-tag "ciGroup$CI_GROUP"
echo ""
echo ""
checks-reporter-with-killswitch "X-Pack Firefox Functional tests / Group ${CI_GROUP}" node scripts/functional_tests --debug --bail --include-tag "ciGroup$CI_GROUP" --config "test/functional/config.firefox.js"
echo ""
echo ""
