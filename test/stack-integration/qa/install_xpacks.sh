#!/bin/bash
if [ -z "$PACKAGE" ]; then . ./envvars.sh; fi
set -e
# if we're running on localhost (not cloud) install x-pack on Elasticsearch and Kibana
# and configure Elasticsearch and Kibana settings
echo -e "\n-- `date` Install Elasticsearch, Kibana and Logstash X-Pack"
case $PACKAGE in
  deb|rpm)
    if [ "${ESHOST}" = "localhost" ]; then
      echo "time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin install -b file:///${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip"
      time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin install -b file:///${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip

      echo -e "\n-- `date` installing the x-pack as the kibana user."
      time sudo -u kibana ${INSTALL_DIR}/kibana/bin/kibana-plugin install file:///${QADIR}/kibana-x-pack-${VERSION}${SNAPSHOT}.zip
    fi

    echo -e "time ${INSTALL_DIR}/logstash/bin/logstash-plugin install file:///${QADIR}/logstash-x-pack-${VERSION}${SNAPSHOT}.zip"
    time ${INSTALL_DIR}/logstash/bin/logstash-plugin install file:///${QADIR}/logstash-x-pack-${VERSION}${SNAPSHOT}.zip
    ;;
  tar.gz)
    if [ "${ESHOST}" = "localhost" ]; then
      echo "time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin install -b file:///${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip"
      time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin install -b file:///${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip

      echo -e "time $WORKAROUND ${INSTALL_DIR}/kibana/bin/kibana-plugin install file:///${QADIR}/kibana-x-pack-${VERSION}${SNAPSHOT}.zip"
      time ${INSTALL_DIR}/kibana/bin/kibana-plugin install file:///${QADIR}/kibana-x-pack-${VERSION}${SNAPSHOT}.zip
    fi

    echo -e "time ${INSTALL_DIR}/logstash/bin/logstash-plugin install file:///${QADIR}/logstash-x-pack-${VERSION}${SNAPSHOT}.zip"
    time ${INSTALL_DIR}/logstash/bin/logstash-plugin install file:///${QADIR}/logstash-x-pack-${VERSION}${SNAPSHOT}.zip
    ;;
  zip)
  echo "install for Windows zip files"
    pushd ${INSTALL_DIR}/logstash/bin/
    # we have to launch this in a cmd shell with "start" so we don't get the final "Installed successfully" message
    start logstash-plugin.bat install file:///`cygpath -m ${QADIR}/logstash-x-pack-${VERSION}${SNAPSHOT}.zip`
    # how do we know when it's done?  We know Kibana plugin install takes a long time so lets do this first

    # cmd /c "bin\logstash-plugin.bat install file:///C:/vagrant/qa/x-pack-6.0.0-beta1.zip"
    popd

    if [ "${ESHOST}" = "localhost" ]; then
      echo "time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin.bat install -b file:///`cygpath -m ${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip`"
      time ${INSTALL_DIR}/elasticsearch/bin/elasticsearch-plugin.bat install -b file:///`cygpath -m ${QADIR}/elasticsearch-x-pack-${VERSION}${SNAPSHOT}.zip`

      echo -e "time ${INSTALL_DIR}/kibana/bin/kibana-plugin${DOTBAT} install file:///`cygpath -m ${QADIR}/kibana-x-pack-${VERSION}${SNAPSHOT}.zip`"
      time ${INSTALL_DIR}/kibana/bin/kibana-plugin${DOTBAT} install file:///`cygpath -m ${QADIR}/kibana-x-pack-${VERSION}${SNAPSHOT}.zip`
    fi

    if [ `${INSTALL_DIR}/logstash/bin/logstash-plugin.bat list | tail -n1` == 'x-pack' ]; then
      echo "Found x-pack installed on logstash"
    else
      echo "Failed to find Logstash x-pack plugin installed"
      exit 1
    fi
    ;;
esac
