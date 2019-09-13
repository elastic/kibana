#!/bin/bash

beat=$(hostname)
command="$beat --c=/usr/share/$beat/config/$beat.yml --strict.perms=false"
echo "Running setup for $beat"

if [[ $beat == "packetbeat" ]]; then
  kibana_domain="localhost"
else
  kibana_domain="kibana"
fi

until curl -s "http://${kibana_domain}:5601/login" | grep "Loading Kibana" > /dev/null; do
	  echo "Waiting for kibana..."
	  sleep 1
done

echo "Creating keystore..."
# create beat keystore
eval "$command keystore create --force"

echo "adding ES_PASSWORD to keystore..."
echo "$ELASTIC_PASSWORD" | ${command} keystore add ELASTIC_PASSWORD --stdin
eval "$command keystore list"

echo "Setting up dashboards..."
# Load the sample dashboards for the Beat.
# REF: https://www.elastic.co/guide/en/beats/metricbeat/master/metricbeat-sample-dashboards.html
eval "$command setup -v"
chown -R 1000:1000 config
ls -l /usr/share/${beat}
ls -l /usr/share/${beat}/kibana
# echo "set config file permissions"
# chmod --verbose go-w /usr/share/${beat}/config/${beat}.yml
# echo "`ls -l /usr/share/${beat}/config/`"
