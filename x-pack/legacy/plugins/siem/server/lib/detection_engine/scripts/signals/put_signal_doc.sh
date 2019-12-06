#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh


# Example: ./put_signal_doc.sh
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -d @./sample_signal.json \
  -X PUT ${ELASTICSEARCH_URL}/${SIGNALS_INDEX}/_doc/45562a28e0dFakeSignalId \
  | jq .
