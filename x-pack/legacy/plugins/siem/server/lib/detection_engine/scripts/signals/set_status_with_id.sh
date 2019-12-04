#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
#./check_env_variables.sh

# Uses a default if no argument is specified
# RULES=(${@:-./rules/root_or_admin_1.json})

# Example: ./post_rule.sh
# Example: ./post_rule.sh ./rules/root_or_admin_1.json
# Example glob: ./post_rule.sh ./rules/*
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/signals/status \
  -d '{"signal_ids": ["45562a28e0dFakeSignalId"], "status": "'$1'"}' \
  | jq .
