#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

export TEST_ES_FROM=source
xvfb-run "$(yarn bin)/grunt" jenkins:unit --from=source;
