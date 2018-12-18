#!/usr/bin/env bash

set -e

source src/dev/ci_setup/checkout_sibling_es.sh

export TEST_BROWSER_HEADLESS=1

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
