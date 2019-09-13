#!/bin/bash
set -x

#cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=/vagrant/qa
cd $QADIR

# First we write our env vars to a file, then run phase1.sh which will use them (and may add to them)
cat <<-PHASE1 >> envvars.sh
QADIR=/vagrant/qa
VMOS=ubuntu
VM=debian-9_deb
BEATS="metricbeat packetbeat filebeat"
PRODUCTS="metricbeat packetbeat filebeat elasticsearch kibana logstash"
XPACK=YES
SECURITY=YES
LICENSE=TRIAL
# LICENSE=BASIC
# LICENSE=GOLD
# LICENSE=PLATINUM
# We want to keep using the default PhantomJS reporting capture type on 1 config
# xpack_reporting_capture_browser_type=chromium

TLS=YES
LINUX_INSTALL_DIR=/usr/share
ESURL=https://elastic:changeit@localhost:9200
KIBANAURL=https://elastic:changeit@localhost:5601
ESHOST=localhost
ESPROTO=https
ESPORT=9200
KIBANAPWD=changeit

KIBANASERVERUSER=kibana
KIBANASERVERPWD=changeit

KIBANAFILEUSER=user
KIBANAFILEPWD=changeme

NATIVEKIBANAUSER=ironman
NATIVEKIBANAPWD=changeme

LOGSTASHUSER=logstash_internal
LOGSTASHPWD=changeme

BEATSUSER=beats_internal
BEATSPWD=changeme

PACKAGE=deb
PLATFORM=-amd64
KIBANA_PLATFORM=-amd64
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
