#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running security solution cypress tests"

checks-reporter-with-killswitch "Security Solution Cypress Tests (Chrome)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config x-pack/test/security_solution_cypress/cli_config.ts
