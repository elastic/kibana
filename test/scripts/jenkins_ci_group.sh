#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  yarn run grunt functionalTests:ensureAllTestsInCiGroup;
  node scripts/build --debug --oss;
else
  installDir="$(realpath $PARENT_DIR/kibana/build/oss/kibana-*-SNAPSHOT-linux-x86_64)"
  destDir=${installDir}-${PARALLEL_PIPELINE_WORKER_INDEX}
  cp -R "$installDir" "$destDir"

  export KIBANA_INSTALL_DIR="$destDir"
fi

yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

if [ "$CI_GROUP" == "1" ]; then
  yarn run grunt run:pluginFunctionalTestsRelease;
fi
