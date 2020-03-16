#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

# if [[ -z "$CODE_COVERAGE" ]] ; then
#   installDir="$(realpath $KIBANA_DIR/build/oss/kibana-*-SNAPSHOT-linux-x86_64)"
#   destDir=${installDir}-${CI_PARALLEL_PROCESS_NUMBER}
#   cp -R "$installDir" "$destDir"

#   export KIBANA_INSTALL_DIR="$destDir"
# fi
