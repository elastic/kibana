#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

node --max-old-space-size=5120 scripts/jest_integration --ci
