#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1
export TEST_ES_FROM=${TEST_ES_FROM:-source}
# This should not be merged into master as we are only running tests for secops
# xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:selenium --from=source;
