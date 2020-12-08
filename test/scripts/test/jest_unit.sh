#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Jest tests" node scripts/jest --ci --verbose --maxWorkers=4
