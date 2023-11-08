#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running APM cypress tests"
cd "$XPACK_DIR"

node plugins/observability_solution/apm/scripts/test/e2e.js

echo ""
echo ""
