#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running synthetics @elastic/synthetics tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "synthetics @elastic/synthetics Tests" \
 node plugins/synthetics/scripts/e2e.js

echo ""
echo ""
