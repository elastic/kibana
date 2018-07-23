#!/usr/bin/env bash

set -e

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

xvfb-run node scripts/functional_test_runner --debug --grep @skipcloud --invert

