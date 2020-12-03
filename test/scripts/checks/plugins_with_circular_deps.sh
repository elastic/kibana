#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check plugins with circular dependencies" \
  node scripts/find_plugins_with_circular_deps
