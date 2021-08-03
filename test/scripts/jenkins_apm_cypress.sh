#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running APM cypress tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM Cypress Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_INSTALL_DIR" \
   --config plugins/apm/ftr_e2e/config.ts

echo ""
echo ""
