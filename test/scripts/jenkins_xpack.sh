#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  echo " -> Running jest tests"
  
  ./test/scripts/test/xpack_jest_unit.sh
else
  echo " -> Running jest tests with coverage"

  # build runtime for canvas
  echo "NODE_ENV=$NODE_ENV"
  node ./x-pack/plugins/canvas/scripts/shareable_runtime
  node scripts/jest x-pack --ci --verbose --maxWorkers=5 --coverage
  # rename file in order to be unique one
  test -f ../target/kibana-coverage/jest/coverage-final.json \
    && mv ../target/kibana-coverage/jest/coverage-final.json \
    ../target/kibana-coverage/jest/xpack-coverage-final.json
  echo ""
  echo ""
fi
