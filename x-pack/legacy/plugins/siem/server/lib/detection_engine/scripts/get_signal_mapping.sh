#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./get_signal_mapping.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-mapping.html
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${ELASTICSEARCH_URL}/${SIGNALS_INDEX}/_mapping \
  | jq .
