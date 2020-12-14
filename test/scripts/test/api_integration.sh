#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "API Integration Tests" \
  node scripts/functional_tests \
    --config test/api_integration/config.js \
    --bail \
    --debug
