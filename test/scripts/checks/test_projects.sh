#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

yarn kbn run-in-packages test
