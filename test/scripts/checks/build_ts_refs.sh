#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Build Typescript Refs" \
  node --preserve-symlinks --preserve-symlinks-main scripts/build_ts_refs
