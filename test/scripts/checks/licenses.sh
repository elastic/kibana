#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check Licenses" \
  node scripts/check_licenses --dev
