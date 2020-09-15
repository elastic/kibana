#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

echo " -> Running jest tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Jest" node --max-old-space-size=6144 scripts/jest --ci --verbose
echo ""
echo ""

echo " -> Running Security Solution cyclic dependency test"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Security Solution cyclic dependency test" node plugins/security_solution/scripts/check_circular_deps
echo ""
echo ""

echo " -> Running List cyclic dependency test"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack List cyclic dependency test" node plugins/lists/scripts/check_circular_deps
echo ""
echo ""

# echo " -> Running jest integration tests"
# cd "$XPACK_DIR"
# node scripts/jest_integration --ci --verbose
# echo ""
# echo ""
