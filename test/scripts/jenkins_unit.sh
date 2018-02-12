#!/usr/bin/env bash

set -e
source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

cd packages/kbn-plugin-helpers
yarn test
cd -

xvfb-run "$(yarn bin)/grunt" jenkins:unit;
