#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

yarn run grunt run:serverIntegrationTests
