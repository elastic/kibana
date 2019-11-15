#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
SIGNAL=${1:-./signals/root_or_admin_update_1.json}

# Example: ./update_signal.sh {id} ./signals/root_or_admin_1.json
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X PUT ${KIBANA_URL}/api/siem/signals \
 -d @${SIGNAL} \
 | jq .
