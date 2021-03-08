#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Verify NOTICE" \
  node scripts/notice --validate
