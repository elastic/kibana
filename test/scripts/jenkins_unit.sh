#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
  echo ""
  echo ""
  # When moving these somewhere also update packages/kbn-storybook/README.md
  echo " -> Running Storybook builds"
  yarn storybook apm --site
  yarn storybook canvas --site
  yarn storybook drilldowns --site
  yarn storybook embeddable --site
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
