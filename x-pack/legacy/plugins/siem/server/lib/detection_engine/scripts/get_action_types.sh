#!/bin/sh

# Example: ./get_action_types.sh
# https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/actions/README.md
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/action/types \
  | jq .
