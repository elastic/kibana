#!/bin/sh

# Example: ./get_action_instances.sh
# https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/actions/README.md#get-apiaction_find-find-actions
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/action/_find \
  | jq .
