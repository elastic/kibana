#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Test Projects" \
  yarn kbn run-in-packages test
