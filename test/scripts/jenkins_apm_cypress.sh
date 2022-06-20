#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running APM cypress tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM Cypress Tests" \
 node plugins/apm/scripts/test/e2e.js

echo ""
echo ""
