#!/usr/bin/env bash

set -e
trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT

export TEST_BROWSER_HEADLESS=1

echo " -> Running mocha tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Mocha" yarn test
echo ""
echo ""

echo " -> Running jest tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Jest" node scripts/jest --ci --verbose
echo ""
echo ""

echo " -> Running SIEM cyclic dependency test"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack SIEM cyclic dependency test" node plugins/siem/scripts/check_circular_deps
echo ""
echo ""

# echo " -> Running jest integration tests"
# cd "$XPACK_DIR"
# node scripts/jest_integration --ci --verbose
# echo ""
# echo ""
