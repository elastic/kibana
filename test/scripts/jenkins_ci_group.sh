#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

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
# TODO: uncomment when example tests are fixed, they are breaking ci:
# https://github.com/elastic/kibana/issues/53230
#   yarn run grunt run:exampleFunctionalTestsRelease --from=source;
  yarn run grunt run:interpreterFunctionalTestsRelease;
fi
