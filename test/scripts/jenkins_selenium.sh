#!/usr/bin/env bash

set -e

"$(dirname $0)/jenkins_setup.sh"

xvfb-run "$(npm bin)/grunt" jenkins:selenium;
