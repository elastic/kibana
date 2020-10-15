#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

checks-reporter-with-killswitch "X-Pack accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/accessibility/config.ts;
