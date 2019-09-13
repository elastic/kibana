#!/bin/bash

set -euo pipefail
cacert=/usr/share/elasticsearch/config/certs/ssl/ca/ca.crt
# Wait for ca file to exist before we continue. If the ca file doesn't exist
# then something went wrong.
while [ ! -f $cacert ]
do
  echo "No cert found at $cacert"
  exit 1
done
ls -l $cacert

es_url=https://elastic:${ELASTIC_PASSWORD}@elasticsearch:9200
# Wait for Elasticsearch to start up before doing anything.
until curl -s --cacert $cacert $es_url -o /dev/null; do
    sleep 3
    echo "Waiting for Elasticsearch..."
done

# Set the password for the kibana user.
# REF: https://www.elastic.co/guide/en/x-pack/6.0/setting-up-authentication.html#set-built-in-user-passwords
until curl --cacert $cacert -s -H 'Content-Type:application/json' \
     -XPUT $es_url/_xpack/security/user/kibana/_password \
     -d "{\"password\": \"${ELASTIC_PASSWORD}\"}"
do
    sleep 2
    echo Failed to set kibana password, retrying...
done

until curl --cacert $cacert -s -H 'Content-Type:application/json' \
     -XPUT $es_url/_xpack/security/user/logstash_system/_password \
     -d "{\"password\": \"${ELASTIC_PASSWORD}\"}"
do
    sleep 2
    echo Failed to set logstash_system password, retrying...
done
