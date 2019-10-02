#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

export TEST_BROWSER_HEADLESS=1

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" run:eslint --dev;
  "$(FORCE_COLOR=0 yarn bin)/grunt" run:test_jest_integration --dev;
fi

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
