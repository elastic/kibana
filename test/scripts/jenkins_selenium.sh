#!/usr/bin/env bash

set -e
source "$(dirname $0)/_jenkins_setup.sh"

"$(npm bin)/grunt" build;

ls build
#cd "build/kibana-6.0.0.-alpha1-SNAPSHOT-linux-x86_64"

#xvfb-run "$(npm bin)/grunt" jenkins:selenium;
