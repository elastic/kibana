#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

installDir="$PARENT_DIR/install/kibana"
destDir="${installDir}-${CI_WORKER_NUMBER}"
cp -R "$installDir" "$destDir"

export KIBANA_INSTALL_DIR="$destDir"

echo " -> Running SIEM cypress tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "SIEM Cypress Tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/siem_cypress/config.ts

echo ""
echo ""
