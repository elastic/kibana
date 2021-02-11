#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Types" \
  node --preserve-symlinks scripts/type_check
