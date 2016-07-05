#!/usr/bin/env bash

set -e

"$(dirname $0)/jenkins_setup.sh"

"$GRUNT" build;
