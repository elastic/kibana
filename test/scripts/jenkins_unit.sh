#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

rename_coverage_file() {
  test -f target/kibana-coverage/jest/coverage-final.json \
    && mv target/kibana-coverage/jest/coverage-final.json \
    target/kibana-coverage/jest/$1-coverage-final.json
}

if [[ -z "$CODE_COVERAGE" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
else
  echo " -> Running jest tests with coverage"
  node scripts/jest --ci --verbose --coverage
  rename_coverage_file "oss"
  echo ""
  echo ""
  echo " -> Running jest integration tests with coverage"
  node --max-old-space-size=6144 scripts/jest_integration --ci --verbose --coverage
  rename_coverage_file "oss-integration"
  echo ""
  echo ""
  echo " -> Running mocha tests with coverage"
  yarn run grunt "test:mochaCoverage";
  echo ""
  echo ""
fi
