#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Test Projects" \
  yarn kbn run test --exclude kibana --oss --skip-kibana-plugins --skip-missing
