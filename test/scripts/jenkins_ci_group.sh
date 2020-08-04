#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";
