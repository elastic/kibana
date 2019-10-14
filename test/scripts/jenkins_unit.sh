#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/scripts/report_failed_tests"' EXIT
fi

export TEST_BROWSER_HEADLESS=1

export CODE_COVERAGE=1

if [[ -z "$CODE_COVERAGE" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
else
  echo "Running code coverage"
  "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit_coverage --dev;
fi


