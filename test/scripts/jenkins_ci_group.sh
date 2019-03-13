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
  # this extra use of $PERCY_BIN has to be accounted for in src/dev/get_percy_env, if it is
  # removed please remove the +1 of the ciGroupCount in src/dev/get_percy_env
  "$PERCY_BIN" exec "$GRUNT_BIN" run:pluginFunctionalTestsRelease --from=source;
fi
