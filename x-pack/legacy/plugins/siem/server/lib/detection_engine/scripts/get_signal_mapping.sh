#!/bin/sh

# Example: ./get_signal_mapping.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-mapping.html
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${ELASTICSEARCH_URL}/${SIGNALS_INDEX}/_mapping \
  | jq .
