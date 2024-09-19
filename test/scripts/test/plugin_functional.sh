#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

checks-reporter-with-killswitch "Plugin Functional Tests" \
  node scripts/functional_tests \
    --config test/plugin_functional/config.ts \
    --bail \
    --debug
