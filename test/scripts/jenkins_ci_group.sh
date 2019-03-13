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

"$GRUNT_BIN" functionalTests:ensureAllTestsInCiGroup;

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1
export TEST_ES_FROM=${TEST_ES_FROM:-source}

"$PERCY_BIN" exec "$GRUNT_BIN" "run:functionalTests_ciGroup${CI_GROUP}" --from=source;

if [ "$CI_GROUP" == "1" ]; then
  "$PERCY_BIN" exec "$GRUNT_BIN" run:pluginFunctionalTestsRelease --from=source;
fi
