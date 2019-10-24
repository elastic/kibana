#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./delete_signal_index.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-delete-index.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE ${ELASTICSEARCH_URL}/${SIGNALS_INDEX} \
  | jq .
