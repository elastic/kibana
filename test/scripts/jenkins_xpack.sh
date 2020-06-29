#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
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
else
  echo " -> Running jest tests with coverage"
  cd "$XPACK_DIR"
  # build runtime for canvas
  echo "NODE_ENV=$NODE_ENV"
  node ./plugins/canvas/scripts/shareable_runtime
  node --max-old-space-size=6144 scripts/jest --ci --verbose --coverage
  # rename file in order to be unique one
  test -f ../target/kibana-coverage/jest/coverage-final.json \
    && mv ../target/kibana-coverage/jest/coverage-final.json \
    ../target/kibana-coverage/jest/xpack-coverage-final.json
  echo ""
  echo ""
fi
