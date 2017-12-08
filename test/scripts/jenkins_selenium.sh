#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

"$(yarn bin)/grunt" build --release;

xvfb-run "$(yarn bin)/grunt" jenkins:selenium;
