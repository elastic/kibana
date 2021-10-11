#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running Uptime @elastic/synthetics tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "Uptime @elastic/synthetics Tests" \
 node plugins/uptime/scripts/e2e.js

echo ""
echo ""
