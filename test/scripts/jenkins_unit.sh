#!/usr/bin/env bash

set -e

export TEST_BROWSER_HEADLESS=1

if [[ -z "$CODE_COVERAGE" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
else
  echo "NODE_ENV=$NODE_ENV"
  echo " -> Running jest tests with coverage"
  node scripts/jest --ci --verbose --coverage
  echo ""
  echo ""
  echo " -> Running mocha tests with coverage"
  yarn run grunt "test:mochaCoverage";
  echo ""
  echo ""
fi
