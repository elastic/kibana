#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

checks-reporter-with-killswitch "X-Pack firefox smoke test" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "smoke" \
    --config test/functional/config.firefox.js;
