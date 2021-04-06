#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Doc API Changes" \
  node scripts/check_published_api_changes
