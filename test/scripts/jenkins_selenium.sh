#!/usr/bin/env bash

set -e
source "$(dirname $0)/_jenkins_setup.sh"

"$(npm bin)/grunt" build;

gem list | grep pleaserun
which pleaserun
#cd build

#xvfb-run "$(npm bin)/grunt" jenkins:selenium;
