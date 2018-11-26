#!/usr/bin/env bash

source src/dev/ci_setup/checkout_sibling_es.sh

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
