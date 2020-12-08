#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Jest Unit Tests" \
  node --expose-gc ./node_modules/.bin/jest --runInBand --logHeapUsage
