#!/bin/sh

# Example: ./put_signal_index.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-mapping.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -d @../signals_mapping.json \
  -X PUT ${ELASTICSEARCH_URL}/${SIGNALS_INDEX} \
  | jq .
