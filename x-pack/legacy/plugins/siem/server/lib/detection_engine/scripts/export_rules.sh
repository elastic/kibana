#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

EXCLUDE_DETAILS=${1:-false}

# Note: This file does not use jq on purpose for testing and pipe redirections

# Example get all the rules except pre-packaged rules
# ./export_rules.sh

# Example get the export details at the end
# ./export_rules.sh false

curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_export?exclude_export_details=${EXCLUDE_DETAILS}
