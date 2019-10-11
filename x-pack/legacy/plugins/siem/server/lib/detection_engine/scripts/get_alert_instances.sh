#!/bin/sh

# Example: ./get_alert_instances.sh
# https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/alerting/README.md#get-apialert_find-find-alerts
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/alert/_find \
  | jq .
