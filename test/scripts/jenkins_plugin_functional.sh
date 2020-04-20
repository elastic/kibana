#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

cd test/plugin_functional/plugins/kbn_sample_panel_action;
if [[ ! -d "target" ]]; then
  yarn build;
fi
cd -;

pwd

yarn run grunt run:pluginFunctionalTestsRelease --from=source;
yarn run grunt run:exampleFunctionalTestsRelease --from=source;
yarn run grunt run:interpreterFunctionalTestsRelease;
