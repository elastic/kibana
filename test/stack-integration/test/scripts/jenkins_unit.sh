#!/usr/bin/env bash

set -e
source "$(dirname $0)/_jenkins_setup.sh"

xvfb-run "$(npm bin)/grunt" jenkins:unit;
