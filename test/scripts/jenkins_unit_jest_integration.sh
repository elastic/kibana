#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh

export TEST_BROWSER_HEADLESS=1

"$(FORCE_COLOR=0 yarn bin)/grunt" run:test_jest_integration --dev;
