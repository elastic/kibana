#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

export TEST_BROWSER_HEADLESS=1

checks-reporter-with-killswitch " Functional tests with code coverage / Group ${CI_GROUP}" \
  node --max-old-space-size=8192 scripts/functional_tests_coverage \
    --debug \
    --include-tag "ciGroup$CI_GROUP"
# if [ "$CI_GROUP" == "1" ]; then
#   # build kbn_tp_sample_panel_action
#   cd test/plugin_functional/plugins/kbn_tp_sample_panel_action;
#   checks-reporter-with-killswitch "Build kbn_tp_sample_panel_action" yarn build;
#   cd -;
#   yarn run grunt run:pluginFunctionalTestsRelease --from=source;
#   yarn run grunt run:interpreterFunctionalTestsRelease;
# fi
