#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

export NODE_OPTIONS="--max-old-space-size=2048"

checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest --ci --verbose --maxWorkers=8
