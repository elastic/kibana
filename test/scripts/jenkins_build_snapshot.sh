#!/usr/bin/env bash

set -e

"$(dirname $0)/jenkins_setup.sh"

"$(npm bin)/grunt" build;
