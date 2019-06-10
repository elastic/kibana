#!/usr/bin/env bash

# This script runs kibana tests compatible with cloud.
#
# The cloud instance setup is done in the elastic/elastic-stack-testing framework,
# where the following environment variables are set pointing to the cloud instance.
#
# export TEST_KIBANA_HOSTNAME
# export TEST_KIBANA_PROTOCOL=
# export TEST_KIBANA_PORT=
# export TEST_KIBANA_USER=
# export TEST_KIBANA_PASS=
#
# export TEST_ES_HOSTNAME=
# export TEST_ES_PROTOCOL=
# export TEST_ES_PORT=
# export TEST_ES_USER=
# export TEST_ES_PASS=
#

set -e

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"

export TEST_BROWSER_HEADLESS=1
node scripts/functional_test_runner --debug --exclude-tag skipCloud $@
