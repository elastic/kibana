#!/bin/bash
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

if [ `grep DISTRIB_ID /etc/*-release | cut -d= -f2` != 'Ubuntu' ]; then
  echo "This script was written for Ubuntu (apt-get, dpkg, etc)"
  exit 1
fi

if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi

./stop_services.sh

# have to wait for services to stop or the uninstall will fail
for i in `seq 1 20`; do sleep 2; service logstash status | tail -n1; service logstash status | grep Stopped && break; done
kill -9 `pidof java`

./purge_products.sh


echo "Removing those unpurged directories"
rm -rf /var/log/filebeat
rm -rf /var/log/packetbeat
rm -rf /var/log/metricbeat
rm -rf /etc/filebeat
rm -rf /etc/packetbeat
rm -rf /etc/metricbeat

# Kibana cleanup
#rm -rf /opt/kibana

# Elasticsearch cleanup
rm -rf /var/log/elasticsearch
rm -rf /var/lib/elasticsearch
rm -rf /etc/elasticsearch
rm -rf /usr/share/elasticsearch

rm -rf /var/log/logstash
rm -rf /etc/logstash
#rm -rf /var/lib/logstash
rm -rf /usr/share/logstash
