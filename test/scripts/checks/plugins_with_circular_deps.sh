#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Plugins With Circular Dependencies" \
  node scripts/find_plugins_with_circular_deps
