#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
  ./test/scripts/jenkins_build_plugins.sh
fi

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

echo " -> Ensuring all functional tests are in a ciGroup"
yarn run grunt functionalTests:ensureAllTestsInCiGroup;

# Do not build kibana for code coverage run
if [[ -z "$CODE_COVERAGE" ]] ; then
  echo " -> building and extracting OSS Kibana distributable for use in functional tests"
  node scripts/build --debug --oss

  mkdir -p "$WORKSPACE/kibana-build-oss"
  cp -pR build/oss/kibana-*-SNAPSHOT-linux-x86_64/. $WORKSPACE/kibana-build-oss/
fi
