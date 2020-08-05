#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
else
  echo " -> Running jest tests with coverage"
  node scripts/jest --ci --verbose --coverage
  echo ""
  echo ""
  echo " -> Running mocha tests with coverage"
  yarn run grunt "test:mochaCoverage";
  echo ""
  echo ""
fi
