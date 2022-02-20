#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running APM @elastic/synthetics tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM @elastic/synthetics Tests" \
 node plugins/apm/scripts/test/synthetics.js

echo ""
echo ""
