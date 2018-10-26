#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

export TEST_ES_FROM=${TEST_ES_FROM:-source}
# This should not merge forward into master. This disables unit tests since we are only running them for secops
# xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --from=source;
