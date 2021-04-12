#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check TypeScript Projects" \
  node scripts/check_ts_projects
