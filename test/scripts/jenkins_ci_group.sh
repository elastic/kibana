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

source src/dev/ci_setup/checkout_sibling_es.sh

"$(FORCE_COLOR=0 yarn bin)/grunt" functionalTests:ensureAllTestsInCiGroup;

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1
export TEST_ES_FROM=${TEST_ES_FROM:-source}

"$(FORCE_COLOR=0 yarn bin)/grunt" "run:functionalTests_ciGroup${CI_GROUP}" --from=source;

if [ "$CI_GROUP" == "1" ]; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" run:pluginFunctionalTestsRelease --from=source;
fi
