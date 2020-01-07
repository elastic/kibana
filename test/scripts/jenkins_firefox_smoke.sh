#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

checks-reporter-with-killswitch "Firefox smoke test" \
  node scripts/functional_tests \
    --bail --debug \
    --kibana-install-dir "$installDir" \
    --include-tag "smoke" \
    --config test/functional/config.firefox.js;
