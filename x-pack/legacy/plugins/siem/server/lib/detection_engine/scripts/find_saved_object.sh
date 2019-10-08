#!/bin/sh

# Uses a default of alert if no argument is specified
TYPE=${1:-alert}

# Example: ./find_saved_object.sh alert
# Example: ./find_saved_object.sh action
# Example: ./find_saved_object.sh action_task_params
# https://www.elastic.co/guide/en/kibana/master/saved-objects-api-find.html#saved-objects-api-find-request
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}/api/saved_objects/_find?type=$TYPE \
  | jq .
