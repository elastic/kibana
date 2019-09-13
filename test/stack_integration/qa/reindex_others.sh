#!/bin/bash

if [ -z "${CONFIG_DIR}" ]; then . ./.sh; fi

echo "See https://www.elastic.co/guide/en/elastic-stack/6.0/upgrading-elastic-stack.html#upgrade-internal-indices"

### POST UPGRADE - run these steps after upgrading Elasticsearch to 6.0
# {"indices":{".security":{"action_required":"upgrade"},".triggered_watches":{"action_required":"upgrade"},".watches":{"action_required":"upgrade"}}}

sudo /usr/share/elasticsearch/bin/x-pack/users useradd tempuser -p changeit -r superuser
curl -k -XGET https://tempuser:changeit@localhost:9200/_xpack/migration/assistance
curl -k -XPOST https://tempuser:changeit@localhost:9200/_xpack/migration/upgrade/.security
curl -k -XPOST https://tempuser:changeit@localhost:9200/_xpack/migration/upgrade/.triggered_watches
curl -k -XPOST https://tempuser:changeit@localhost:9200/_xpack/migration/upgrade/.watches

echo "this curl using elastic:changeit should work again now"
curl -k https://elastic:changeit@localhost:9200

sudo /usr/share/elasticsearch/bin/x-pack/users userdel tempuser
sudo /usr/share/elasticsearch/bin/x-pack/users list
#No users found
