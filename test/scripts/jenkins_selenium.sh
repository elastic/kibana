#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

node scripts/build --release --debug --oss;

xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:selenium --from=source;
