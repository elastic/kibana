#!/bin/bash
set -x

#cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=/vagrant/qa
cd $QADIR

# First we write our env vars to a file, then run phase1.sh which will use them (and may add to them)
cat <<-PHASE1 >> envvars.sh
QADIR=/vagrant/qa
VMOS=ubuntu
VM=ubuntu_deb_cloud
BEATS="metricbeat packetbeat filebeat"
#PRODUCTS="metricbeat packetbeat filebeat elasticsearch kibana logstash apm-server"
PRODUCTS="metricbeat packetbeat filebeat logstash apm-server"
OSS=
XPACK=YES
SECURITY=YES
LICENSE=TRIAL
# LICENSE=BASIC
# LICENSE=GOLD
# LICENSE=PLATINUM

LINUX_INSTALL_DIR=/usr/share

#ESURL=https://elastic:changeit@localhost:9200
ESURL=https://super:changeit@ab2e599a103b4766eb684037aab9aed8.us-east-1.aws.staging.foundit.no:9243/
#ESHOST=localhost
ESHOST=ab2e599a103b4766eb684037aab9aed8.us-east-1.aws.staging.foundit.no
ESPROTO=https
ESPORT=9243

#KIBANAURL=https://elastic:changeit@localhost:5601
KIBANAURL=https://super:changeit@fbe2607cb7b7983171bf2e3ac46745f6.us-east-1.aws.staging.foundit.no:9243
KIBANAHOST=fbe2607cb7b7983171bf2e3ac46745f6.us-east-1.aws.staging.foundit.no
KIBANAPORT=9243

KIBANAPWD=changeit

CLOUDID=630-SNAPSHOT:dXMtZWFzdC0xLmF3cy5zdGFnaW5nLmZvdW5kaXQubm8kYWIyZTU5OWExMDNiNDc2NmViNjg0MDM3YWFiOWFlZDgkZmJlMjYwN2NiN2I3OTgzMTcxYmYyZTNhYzQ2NzQ1ZjY=

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

./phase1.sh
