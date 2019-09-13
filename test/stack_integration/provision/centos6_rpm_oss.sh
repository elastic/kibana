#!/bin/bash
set -x

QADIR=/vagrant/qa
cd $QADIR

# First we write our env vars to a file, then run phase1.sh which will use them (and may add to them)
cat <<-PHASE1 >> envvars.sh
QADIR=/vagrant/qa
VMOS=centos
VM=centos6_rpm_oss
BEATS="metricbeat packetbeat filebeat"
PRODUCTS="metricbeat packetbeat filebeat elasticsearch kibana logstash apm-server"
OSS=-oss
XPACK=NO
SECURITY=NO
LICENSE=NONE
# LICENSE=TRIAL
# LICENSE=BASIC
# LICENSE=GOLD
# LICENSE=PLATINUM


LINUX_INSTALL_DIR=/usr/share
ESURL=http://temp:temp@localhost:9200
KIBANAURL=http://elastic:changeit@localhost:5601
ESHOST=localhost
ESPROTO=http
ESPORT=9200

PACKAGE=rpm
PLATFORM=-x86_64
KIBANA_PLATFORM=-x86_64
KIBANAIP=localhost

DOTBAT=
INSTALL_DIR=/usr/share
CONFIG_DIR=/etc

ES_CONFIG=\${CONFIG_DIR}/elasticsearch/elasticsearch.yml

LOGSTASH_CONFIG=\${CONFIG_DIR}/logstash/conf.d/logstash.conf
LOGSTASH_YML_DIR=\${CONFIG_DIR}/logstash

KIBANA_CONFIG=\${CONFIG_DIR}/kibana/kibana.yml
KIBANA_LOG=/var/log/kibana/kibana.stdout

PHASE1

#./phase1.sh
