#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Jest Integration Tests" \
  node --expose-gc scripts/jest_integration --logHeapUsage --ci --verbose --coverage
