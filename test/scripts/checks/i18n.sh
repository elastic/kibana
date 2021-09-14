#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check i18n" \
  node scripts/i18n_check --ignore-missing
