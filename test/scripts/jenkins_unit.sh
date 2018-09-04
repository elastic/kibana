#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

if [[ "$PR_TARGET_BRANCH" = "origin/master" ]]; then
  export TEST_ES_FROM=snapshot
else
  export TEST_ES_FROM=source
fi
xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --from=source;
