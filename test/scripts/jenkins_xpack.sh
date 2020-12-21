#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  echo " -> Running jest tests"
  
  ./test/scripts/test/xpack_jest_unit.sh
else
  echo " -> Build runtime for canvas"
  # build runtime for canvas
  echo "NODE_ENV=$NODE_ENV"
  node ./x-pack/plugins/canvas/scripts/shareable_runtime
  echo " -> Running jest tests with coverage"
  cd x-pack
  node --max-old-space-size=6144 scripts/jest --ci --verbose --maxWorkers=5 --coverage --config jest.config.js || true;
  # rename file in order to be unique one
  test -f ../target/kibana-coverage/jest/coverage-final.json \
    && mv ../target/kibana-coverage/jest/coverage-final.json \
    ../target/kibana-coverage/jest/xpack-coverage-final.json
  echo ""
  echo ""
fi
