#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

echo " -> Running mocha tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Karma Tests" yarn test:browser
echo ""
echo ""

echo " -> Running jest tests"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack Jest" node scripts/jest --ci --verbose
echo ""
echo ""

echo " -> Running SIEM cyclic dependency test"
cd "$XPACK_DIR"
checks-reporter-with-killswitch "X-Pack SIEM cyclic dependency test" node legacy/plugins/siem/scripts/check_circular_deps
echo ""
echo ""

# FAILING: https://github.com/elastic/kibana/issues/44250
# echo " -> Running jest contracts tests"
# cd "$XPACK_DIR"
# SLAPSHOT_ONLINE=true CONTRACT_ONLINE=true node scripts/jest_contract.js --ci --verbose
# echo ""
# echo ""

# echo " -> Running jest integration tests"
# cd "$XPACK_DIR"
# node scripts/jest_integration --ci --verbose
# echo ""
# echo ""
