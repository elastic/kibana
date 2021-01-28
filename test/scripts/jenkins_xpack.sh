#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

echo " -> Running jest tests"
./test/scripts/test/xpack_jest_unit.sh