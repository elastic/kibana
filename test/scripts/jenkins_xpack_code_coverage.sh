#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

export TEST_BROWSER_HEADLESS=1

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  echo " -> Ensuring all functional tests are in a ciGroup"
  cd "$XPACK_DIR"
  node scripts/functional_tests --assert-none-excluded \
    --include-tag ciGroup1 \
    --include-tag ciGroup2 \
    --include-tag ciGroup3 \
    --include-tag ciGroup4 \
    --include-tag ciGroup5 \
    --include-tag ciGroup6 \
    --include-tag ciGroup7 \
    --include-tag ciGroup8 \
    --include-tag ciGroup9 \
    --include-tag ciGroup10
fi

echo " -> Running functional and api tests"
cd "$XPACK_DIR"

export NODE_OPTIONS=--max_old_space_size=8192

checks-reporter-with-killswitch "X-Pack Functional tests code coverage / Group ${CI_GROUP}" \
  node scripts/functional_tests_coverage \
    --debug \
    --include-tag "ciGroup$CI_GROUP"

echo ""
echo ""
