#!/usr/bin/env bash

set -e
source "$(dirname $0)/_jenkins_setup.sh"

"$(npm bin)/grunt" build;
