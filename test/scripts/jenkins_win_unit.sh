#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

export TEST_ES_FROM=snapshot
export TEST_BROWSER_HEADLESS=1
"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --from=snapshot;
