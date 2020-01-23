#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default of alert if no argument is specified
TYPE=${1:-alert}

# Example: ./find_saved_object.sh alert
# Example: ./find_saved_object.sh action
# Example: ./find_saved_object.sh action_task_params
# https://www.elastic.co/guide/en/kibana/master/saved-objects-api-find.html#saved-objects-api-find-request
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}${SPACE_URL}/api/saved_objects/_find?type=$TYPE \
  | jq .
