#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

checks-reporter-with-killswitch "Example Functional Tests" \
  node scripts/functional_tests \
    --config test/examples/config.js \
    --bail \
    --debug
