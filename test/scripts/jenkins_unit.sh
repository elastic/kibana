#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
