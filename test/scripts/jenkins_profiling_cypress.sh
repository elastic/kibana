#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running Profiling cypress tests"
cd "$XPACK_DIR"

node plugins/profiling/scripts/test/e2e.js

echo ""
echo ""
