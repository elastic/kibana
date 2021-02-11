#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Types" \
  node scripts/build_ts_refs && \
  node scripts/type_check
