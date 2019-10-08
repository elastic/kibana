#!/bin/sh

# Example: ./get_alert_types.sh
# https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/alerting/README.md#get-apialerttypes-list-alert-types
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/alert/types \
  | jq .
