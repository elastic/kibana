#!/usr/bin/env bash

set -e
trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT


if [[ "$JOB" != "firefox-intake"* ]]; then
  yarn run grunt functionalTests:ensureAllTestsInCiGroup;
fi

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1

if [[ "$JOB" != "firefox-intake"* ]]; then
  checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
fi

if [ "$CI_GROUP" == "1" ]; then
  # build kbn_tp_sample_panel_action
  cd test/plugin_functional/plugins/kbn_tp_sample_panel_action;
  checks-reporter-with-killswitch "Build kbn_tp_sample_panel_action" yarn build;
  cd -;
  yarn run grunt run:pluginFunctionalTestsRelease --from=source;
  yarn run grunt run:interpreterFunctionalTestsRelease;
fi

if [[ "$JOB" = "firefox-intake"* ]]; then
  # Firefox functional tests
  node scripts/functional_tests --bail --debug --kibana-install-dir "$installDir" --config "test/functional/config.firefox.js" --include-tag "smoke"
fi
