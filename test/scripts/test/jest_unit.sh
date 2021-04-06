#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Jest Unit Tests" \
  node --max-old-space-size=8192 --expose-gc ./node_modules/.bin/jest --ci --logHeapUsage --runInBand --config jest.config.js
