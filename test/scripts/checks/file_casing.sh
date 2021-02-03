#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check File Casing" \
  node scripts/check_file_casing --quiet
