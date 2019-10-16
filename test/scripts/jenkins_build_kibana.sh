#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

echo " -> Ensuring all functional tests are in a ciGroup"
yarn run grunt functionalTests:ensureAllTestsInCiGroup;

echo " -> building and extracting OSS Kibana distributable for use in functional tests"
node scripts/build --debug --oss
