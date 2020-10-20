#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd x-pack
checks-reporter-with-killswitch "X-Pack Jest" node --max-old-space-size=6144 scripts/jest --ci --verbose --maxWorkers=10
