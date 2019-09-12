#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh
yarn run grunt functionalTests:ensureAllTestsInCiGroup;
node scripts/build --debug --oss

node scripts/es snapshot --license=oss --download-only;
