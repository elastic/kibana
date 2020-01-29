#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

if [[ -z "$CODE_COVERAGE" ]]; then
  checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

  if [ "$CI_GROUP" == "1" ]; then
    source test/scripts/jenkins_build_kbn_tp_sample_panel_action.sh
    yarn run grunt run:pluginFunctionalTestsRelease --from=source;
    yarn run grunt run:exampleFunctionalTestsRelease --from=source;
    yarn run grunt run:interpreterFunctionalTestsRelease;
  fi
else
  echo " -> Running Functional tests with code coverage"
  export NODE_OPTIONS=--max_old_space_size=8192
  yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
fi
