#!/bin/sh

# Uses a default if no argument is specified
SIGNAL=${1:-./signals/root_or_admin_1.json}

# Example: ./post_signal.sh
# Example: ./post_signal.sh ./signals/root_or_admin_1.json
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}/api/siem/signals \
 -d @${SIGNAL} \
 | jq .
