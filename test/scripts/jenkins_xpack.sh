#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

echo " -> Running mocha tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Karma Tests" yarn test:karma
echo ""
echo ""

echo " -> Running jest tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Jest" node --max-old-space-size=6144 scripts/jest --ci --verbose
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
