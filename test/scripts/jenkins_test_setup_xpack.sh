#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]]; then

  destDir="build/kibana-build-xpack"
  if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
    destDir="${destDir}-${CI_PARALLEL_PROCESS_NUMBER}"
  fi

  if [[ ! -d $destDir ]]; then
    mkdir -p $destDir
    cp -pR "$WORKSPACE/kibana-build-xpack/." $destDir/
  fi

  export KIBANA_INSTALL_DIR="$(realpath $destDir)"

  cd "$XPACK_DIR"
fi
