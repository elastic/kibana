#!/usr/bin/env bash

set -e

export TEST_BROWSER_HEADLESS=1

if [[ -z "$CODE_COVERAGE" ]] ; then
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
else
  echo " -> Running jest tests with coverage"
  cd "$XPACK_DIR"
  # build runtime for canvas
  echo "NODE_ENV=$NODE_ENV"
  node ./legacy/plugins/canvas/scripts/shareable_runtime
  checks-reporter-with-killswitch "X-Pack Jest Coverage" node scripts/jest --ci --verbose --coverage
  # rename file in order to be unique one
  mv ../target/kibana-coverage/jest/coverage-final.json ../target/kibana-coverage/jest/xpack-coverage-final.json
  echo ""
  echo ""
fi