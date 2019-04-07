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

"$(FORCE_COLOR=0 yarn bin)/grunt" functionalTests:ensureAllTestsInCiGroup;

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1

yarn run github-checks-reporter "functionalTests_ciGroup${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

if [ "$CI_GROUP" == "1" ]; then
  # build kbn_tp_sample_panel_action
  cd test/plugin_functional/plugins/kbn_tp_sample_panel_action;
  yarn run github-checks-reporter "build kbn_tp_sample_panel_action" yarn build;
  cd -;
  yarn run github-checks-reporter "pluginFunctionalTestsRelease" yarn run grunt run:pluginFunctionalTestsRelease --from=source;
  yarn run github-checks-reporter "interpreterFunctionalTestsRelease" yarn run grunt run:interpreterFunctionalTestsRelease;
fi
