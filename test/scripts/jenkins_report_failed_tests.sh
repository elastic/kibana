#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:report;
