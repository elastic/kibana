#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Build Typescript References" \
  node scripts/build_ts_refs.js
