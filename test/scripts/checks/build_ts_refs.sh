#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Build TS Refs" \
  node scripts/build_ts_refs
