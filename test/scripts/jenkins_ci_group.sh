#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

export TEST_BROWSER_HEADLESS=1

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  # yarn run grunt functionalTests:ensureAllTestsInCiGroup;
  node scripts/build --debug --oss;
else
  installDir="$(realpath $PARENT_DIR/kibana/build/oss/kibana-*-SNAPSHOT-linux-x86_64)"
  destDir=${installDir}-${CI_WORKER_NUMBER}
  cp -R "$installDir" "$destDir"

  export KIBANA_INSTALL_DIR="$destDir"
fi

checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

if [ "$CI_GROUP" == "1" ]; then
  # build kbn_tp_sample_panel_action
  cd test/plugin_functional/plugins/kbn_tp_sample_panel_action;
  checks-reporter-with-killswitch "Build kbn_tp_sample_panel_action" yarn build;
  cd -;
  yarn run grunt run:pluginFunctionalTestsRelease --from=source;
  yarn run grunt run:interpreterFunctionalTestsRelease;
fi
