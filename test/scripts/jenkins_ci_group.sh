#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  if [[ -z "$IS_PIPELINE_JOB" ]] ; then
    yarn run grunt functionalTests:ensureAllTestsInCiGroup;
    node scripts/build --debug --oss;
  else
    installDir="$(realpath $PARENT_DIR/kibana/build/oss/kibana-*-SNAPSHOT-linux-x86_64)"
    destDir=${installDir}-${CI_WORKER_NUMBER}
    cp -R "$installDir" "$destDir"

    export KIBANA_INSTALL_DIR="$destDir"
  fi

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
