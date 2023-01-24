#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running security solution cypress tests"
cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --config test/security_solution_cypress/config.firefox.ts

echo ""
echo ""
