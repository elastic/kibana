#!/bin/sh

# Example: ./get_alert_tasks.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/tasks.html 
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${ELASTICSEARCH_URL}/${TASK_MANAGER_INDEX}*/_search \
  --data '{
    "query": {
      "term" : { "task.taskType" : "alerting:siem.signals" }
    },
    "size": 100
    }
  ' \
| jq .
