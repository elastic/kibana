#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

installDir="$PARENT_DIR/install/kibana"
destDir="${installDir}-${CI_WORKER_NUMBER}"
cp -R "$installDir" "$destDir"

export KIBANA_INSTALL_DIR="$destDir"

echo " -> Running security solution cypress tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "Security solution Cypress Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_INSTALL_DIR" \
   --config test/security_solution_cypress/config.ts

echo ""
echo ""
