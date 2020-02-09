#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh
source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

checks-reporter-with-killswitch "X-Pack visual regression tests" \
  yarn run percy exec -t 500 \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/visual_regression/config.js;
