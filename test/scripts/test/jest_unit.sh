#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Jest Unit Tests" \
  node -max-old-space-size=4800 scripts/jest --ci --maxWorkers=6
