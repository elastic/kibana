#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Build TS Refs" \
  node scripts/build_ts_refs \
    --ignore-type-failures \
    --clean \
    --no-cache \
    --force \
    --debug

checks-reporter-with-killswitch "Check Types" \
  node scripts/type_check

echo " -- building api docs"
node scripts/build_api_docs
