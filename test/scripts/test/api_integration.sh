#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

node scripts/functional_tests \
  --config test/api_integration/config.js \
  --bail \
  --debug
