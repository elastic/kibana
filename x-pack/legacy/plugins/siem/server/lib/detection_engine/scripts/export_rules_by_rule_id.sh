#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh


# Uses a default if no argument is specified
RULES=${1:-./rules/export/ruleid_queries.json}
EXCLUDE_DETAILS=${2:-false}

# Note: This file does not use jq on purpose for testing and pipe redirections

# Example get all the rules except pre-packaged rules
# ./export_rules_by_rule_id.sh

# Example get the export details at the end
# ./export_rules_by_rule_id.sh ./rules/export/ruleid_queries.json false
curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_export?exclude_export_details=${EXCLUDE_DETAILS} \
  -d @${RULES}
