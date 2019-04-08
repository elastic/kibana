#!/usr/bin/env bash

set -e

function report {
  if [[ -z "$PR_SOURCE_BRANCH" ]]; then
    node src/dev/failed_tests/cli
  else
    echo "Failure issues not created on pull requests"
  fi
}

trap report EXIT

export TEST_BROWSER_HEADLESS=1

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
