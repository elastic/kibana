#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

yarn kbn run test --skip-kibana --skip-kibana-extra

xvfb-run "$(yarn bin)/grunt" jenkins:unit;
