#!/bin/bash
set -x

#cd "$( dirname "${BASH_SOURCE[0]}" )"
# QADIR=/c/vagrant/qa
# cd $QADIR

# source this to get the version so we can figure out the version-dependent KIBANA_PLATFORM
. ./envvars.sh

# First we write our env vars to a file, then run phase1.sh which will use them (and may add to them)
cat <<-PHASE1 >> envvars.sh
QADIR=/c/vagrant/qa
VMOS=windows
VM=w2012_zip
PACKAGE=zip
PLATFORM=-windows-x86_64
# KIBANA_PLATFORM=-windows-x86_64 - see conditional below
OSS=
XPACK=YES
SECURITY=YES
TLS=YES
LICENSE=TRIAL
# LICENSE=BASIC
# LICENSE=GOLD
# LICENSE=PLATINUM

BEATS="metricbeat filebeat winlogbeat"
PRODUCTS="metricbeat filebeat winlogbeat elasticsearch kibana logstash apm-server"


ESURL=https://elastic:changeit@localhost:9200
KIBANAURL=https://elastic:changeit@localhost:5601
ESHOST=localhost
ESPROTO=https
ESPORT=9200
KIBANAPWD=changeit
KIBANAIP=10.0.2.15

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


WINDOWS_INSTALL_DIR=/c/windowsInstalls/${VERSION}
DOTBAT=.bat
INSTALL_DIR=/c/windowsInstalls/${VERSION}
CONFIG_DIR=/c/windowsInstalls/${VERSION}
ES_CONFIG=\${CONFIG_DIR}/elasticsearch/config/elasticsearch.yml

LOGSTASH_CONFIG=\${CONFIG_DIR}/logstash/config/logstash.conf
LOGSTASH_YML_DIR=\${INSTALL_DIR}/logstash/config

KIBANA_CONFIG=\${CONFIG_DIR}/kibana/config/kibana.yml
KIBANA_LOG=\$INSTALL_DIR/kibana/log/kibana.stdout

PHASE1

if [[ "${VERSION}" > "6" ]]; then
  echo KIBANA_PLATFORM=-windows-x86_64 >> envvars.sh
else
  echo KIBANA_PLATFORM=-windows-x86 >> envvars.sh
fi
