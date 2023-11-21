#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

echo " -> Running fleet cypress tests"
cd "$XPACK_DIR"

cd x-pack/plugins/fleet
yarn --cwd x-pack/plugins/fleet cypress:run

echo ""
echo ""
