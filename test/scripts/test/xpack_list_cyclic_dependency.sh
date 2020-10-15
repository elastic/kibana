#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd x-pack
checks-reporter-with-killswitch "X-Pack List cyclic dependency test" node plugins/lists/scripts/check_circular_deps
