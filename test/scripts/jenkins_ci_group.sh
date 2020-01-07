#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

if [ "$CI_GROUP" == "1" ]; then
  source test/scripts/jenkins_build_kbn_tp_sample_panel_action.sh
  yarn run grunt run:pluginFunctionalTestsRelease --from=source;
  yarn run grunt run:exampleFunctionalTestsRelease --from=source;
  yarn run grunt run:interpreterFunctionalTestsRelease;
fi
