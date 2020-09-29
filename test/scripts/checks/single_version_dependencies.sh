#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check single version dependencies" \
  node scripts/check_single_version_dependencies \
    --quiet
