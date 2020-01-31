#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]]; then
  installDir="$PARENT_DIR/install/kibana"
  destDir="${installDir}-${CI_PARALLEL_PROCESS_NUMBER}"
  cp -R "$installDir" "$destDir"

  export KIBANA_INSTALL_DIR="$destDir"

  cd "$XPACK_DIR"
fi
