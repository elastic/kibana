#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

node scripts/functional_tests \
  --config test/plugin_functional/config.ts \
  --bail \
  --debug
