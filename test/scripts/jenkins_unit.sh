#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/scripts/report_failed_tests"' EXIT
fi

export TEST_BROWSER_HEADLESS=1

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
