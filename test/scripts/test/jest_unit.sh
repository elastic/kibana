#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=8192"

# checks-reporter-with-killswitch "Jest Unit Tests" \
#   node --preserve-symlinks --preserve-symlinks-main scripts/jest --ci --verbose --runInBand

yarn jest --ci --verbose --runInBand --config jest.config.js
