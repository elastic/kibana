#!/usr/bin/env bash

set -e

"$(dirname $0)/jenkins_setup.sh"

xvfb-run "$GRUNT" jenkins:unit;
