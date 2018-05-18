#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:docs;
