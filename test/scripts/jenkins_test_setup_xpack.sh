#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]]; then
  destDir="$WORKSPACE/kibana-build-${TASK_QUEUE_PROCESS_ID:-$CI_PARALLEL_PROCESS_NUMBER}"

  if [[ ! -d $destDir ]]; then
    mkdir -p $destDir
    cp -pR "$WORKSPACE/kibana-build/." $destDir/
  fi

  export KIBANA_INSTALL_DIR="$(realpath $destDir)"

  cd "$XPACK_DIR"
fi
