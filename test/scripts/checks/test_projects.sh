#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

yarn kbn run test --exclude kibana --oss --skip-kibana-plugins --skip-missing
