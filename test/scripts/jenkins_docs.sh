#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

"$(npm bin)/grunt" jenkins:docs;
