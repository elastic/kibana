#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running User Experience plugin @elastic/synthetics tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "User Experience plugin @elastic/synthetics Tests" \
 node plugins/ux/scripts/e2e.js

echo ""
echo ""
