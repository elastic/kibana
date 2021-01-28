#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Bundle Limits" \
  node scripts/build_kibana_platform_plugins --validate-limits
