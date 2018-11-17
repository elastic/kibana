#!/usr/bin/env bash

set -e
set -o pipefail

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"

export TEST_BROWSER_HEADLESS=1
export XPACK_DIR="$(cd "$(dirname "$0")/../../x-pack"; pwd)"
echo "-> XPACK_DIR ${XPACK_DIR}"


echo " -> Running mocha tests"
cd "$XPACK_DIR"
yarn test
echo ""
echo ""


echo " -> Running jest tests"
cd "$XPACK_DIR"
node scripts/jest --ci --no-cache --verbose
echo ""
echo ""
