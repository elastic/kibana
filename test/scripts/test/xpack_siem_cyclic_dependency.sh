#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd x-pack
checks-reporter-with-killswitch "X-Pack SIEM cyclic dependency test" node plugins/siem/scripts/check_circular_deps
