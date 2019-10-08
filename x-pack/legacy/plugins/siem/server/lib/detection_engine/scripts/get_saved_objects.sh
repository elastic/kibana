#!/bin/sh

# Example: ./get_saved_object.sh
# https://www.elastic.co/guide/en/kibana/master/saved-objects-api-get.html
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/saved_objects/$1/$2 \
  | jq .
