#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running synthetics @elastic/synthetics tests"
cd "$XPACK_DIR"

node plugins/observability_solution/synthetics/scripts/e2e.js

echo ""
echo ""
