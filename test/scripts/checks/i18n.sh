#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

node scripts/i18n_check --ignore-missing
