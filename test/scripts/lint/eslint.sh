#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Lint: eslint" \
  node scripts/eslint --no-cache
