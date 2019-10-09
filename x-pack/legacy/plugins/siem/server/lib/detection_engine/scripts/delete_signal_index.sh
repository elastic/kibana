#!/bin/sh

# Example: ./delete_signal_index.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-delete-index.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE ${ELASTICSEARCH_URL}/${SIGNALS_INDEX} \
  | jq .
