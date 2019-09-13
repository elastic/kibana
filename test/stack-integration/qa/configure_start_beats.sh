#!/bin/bash
if [ -z "$BEATS" ]; then . ./envvars.sh; fi
set -x
# don't exit on errors like
# 2018-12-13T22:56:27.757Z        ERROR   instance/beat.go:886    Exiting: 403 Forbidden: {"error":{"root_cause":[{"type":"security_exception","reason":"action [cluster:admin/ilm/put] is unauthorized for user [beats_internal]"}],"type":"security_exception","reason":"action [cluster:admin/ilm/put] is unauthorized for user [beats_internal]"},"status":403}
# Exiting: 403 Forbidden: {"error":{"root_cause":[{"type":"security_exception","reason":"action [cluster:admin/ilm/put] is unauthorized for user [beats_internal]"}],"type":"security_exception","reason":"action [cluster:admin/ilm/put] is unauthorized for user [beats_internal]"},"status":403}
set +e

for beat in $BEATS; do (
  cp ${QADIR}/../config/$beat.yml ${CONFIG_DIR}/$beat/$beat.yml

  if [[ "$VERSION" < "6" ]] && [ "$beat" = "metricbeat" ]; then
    sed -i '/- process_summary/d' ${CONFIG_DIR}/metricbeat/metricbeat.yml
  fi

  if [ "$SNAPSHOT" = "-SNAPSHOT" ]; then
    sed -i 's|.*setup.dashboards.snapshot:.*|setup.dashboards.snapshot: true|' ${CONFIG_DIR}/$beat/$beat.yml
  fi
  if [ $TLS = YES ] && [ "${ESHOST}" = "localhost" ]; then
    cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/$beat/
    cp ${QADIR}/../certs/elasticsearch/* ${CONFIG_DIR}/$beat/
  else
    sed -i 's|https|http|' ${CONFIG_DIR}/$beat/$beat.yml
    sed -i 's|ssl|#ssl|' ${CONFIG_DIR}/$beat/$beat.yml
  fi

  if [ "${XPACK}" = "YES" ]; then
    echo "xpack.monitoring": >> ${CONFIG_DIR}/$beat/$beat.yml
    echo "  enabled: true" >> ${CONFIG_DIR}/$beat/$beat.yml
    echo "  elasticsearch:" >> ${CONFIG_DIR}/$beat/$beat.yml
    echo "    url: \"${ESPROTO}://${ESHOST}:${ESPORT}\"" >> ${CONFIG_DIR}/$beat/$beat.yml
    echo "    username: elastic" >> ${CONFIG_DIR}/$beat/$beat.yml
    echo "    password: changeit" >> ${CONFIG_DIR}/$beat/$beat.yml
  fi

); done


case $PACKAGE in
  deb|rpm)
    for beat in $BEATS; do (
      pushd $INSTALL_DIR/${beat}/
      if [ $TLS = YES ] && [ "${ESHOST}" = "localhost" ]; then
        sed -i "s|ssl.certificate: .*|ssl.certificate: "${CONFIG_DIR}/$beat/elasticsearch.crt"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.key: .*|ssl.key: "${CONFIG_DIR}/$beat/elasticsearch.key"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.certificate_authorities: .*|ssl.certificate_authorities: [\"${CONFIG_DIR}/$beat/ca.crt\"]|" ${CONFIG_DIR}/$beat/$beat.yml
      fi

      if [ "${ESHOST}" != "localhost" ]; then
        sed -i "s|localhost:9200|${ESHOST}:${ESPORT}|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|localhost:5601|${KIBANAHOST}:${KIBANAPORT}|" ${CONFIG_DIR}/$beat/$beat.yml
      fi

      echo -e "\n-- `date` Load ${beat} index patterns, saves searches, visualizations, and dashboards"
      if [[ "$VERSION" > "6" ]]; then
        pushd ${INSTALL_DIR}/${beat}
        echo "############################################# ${CLOUDID} ++++++++++++++++++++++++++++++++"
        if [ -z "$CLOUDID" ]; then
          echo "No CloudID"
          sudo ${beat} setup -e
        else
          echo "We have a CLOUDID so use it"
          # this is really awkward.  Cloud doesn't show the kibana user in "Users"
          # but it must be there because I also can't create user kibana.
          # But since I don't know the kibana user's password I can't use it in the beats
          # config to load dashboards like we do locally.  So use a "superuser" named "super"
          sed -i 's|username: "kibana"|username: "super"|' ${CONFIG_DIR}/$beat/$beat.yml
          sudo ${beat} setup -e -E "cloud.id=${CLOUDID}"
        fi
        sleep 5
        popd
      else
        pushd ${INSTALL_DIR}/${beat}/scripts/
        ./import_dashboards --insecure $AUTH -es ${ESURL} -url https://${BASEURL}/downloads/beats/beats-dashboards/beats-dashboards-${VERSION}${SNAPSHOT}.zip
        popd
      fi
      echo -e "\n-- `date` Start ${beat}"
      service ${beat} start
      sleep 5
      popd
    ); done
    ;;
  tar.gz)
    for beat in $BEATS; do (
      pushd $INSTALL_DIR/${beat}/
      if [ $TLS = YES ]; then
        sed -i "s|ssl.certificate: .*|ssl.certificate: "${CONFIG_DIR}/$beat/elasticsearch.crt"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.key: .*|ssl.key: "${CONFIG_DIR}/$beat/elasticsearch.key"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.certificate_authorities: .*|ssl.certificate_authorities: [\"${CONFIG_DIR}/$beat/ca.crt\"]|" ${CONFIG_DIR}/$beat/$beat.yml
      fi
      sudo chown -R vagrant:vagrant $INSTALL_DIR/${beat}
      echo -e "\n-- `date` Load ${beat} index patterns, saves searches, visualizations, and dashboards"
      if [[ "$VERSION" > "6" ]]; then
        su vagrant -c "$INSTALL_DIR/${beat}/${beat} setup -e -c ${CONFIG_DIR}/${beat}/${beat}.yml"
        sleep 5
      else
        pushd ${INSTALL_DIR}/${beat}/scripts/
        ./import_dashboards --insecure $AUTH -es ${ESURL} -url https://${BASEURL}/downloads/beats/beats-dashboards/beats-dashboards-${VERSION}${SNAPSHOT}.zip
        popd
      fi
      echo -e "\n-- `date` Start ${beat}"
      if [ $beat = packetbeat ]; then
        mkdir $INSTALL_DIR/${beat}/logs
        sudo chown -R root:root $INSTALL_DIR/${beat}
        nohup $INSTALL_DIR/${beat}/${beat} > $INSTALL_DIR/${beat}/logs/${beat}.log &
        # $INSTALL_DIR/${beat}/${beat} &
      else
        su vagrant -c "mkdir $INSTALL_DIR/${beat}/logs"
        su vagrant -c "nohup $INSTALL_DIR/${beat}/${beat} > $INSTALL_DIR/${beat}/logs/${beat}.log &"
        # su vagrant -c $INSTALL_DIR/${beat}/${beat} &
      fi
      sleep 5
      popd
    ); done
    ;;
  zip)
    for beat in $BEATS; do (
      pushd $INSTALL_DIR/${beat}/
      if [ $TLS = YES ]; then
        sed -i "s|ssl.certificate: .*|ssl.certificate: "`cygpath -m ${CONFIG_DIR}/$beat/elasticsearch.crt`"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.key: .*|ssl.key: "`cygpath -m ${CONFIG_DIR}/$beat/elasticsearch.key`"|" ${CONFIG_DIR}/$beat/$beat.yml
        sed -i "s|ssl.certificate_authorities: .*|ssl.certificate_authorities: [\"`cygpath -m ${CONFIG_DIR}/$beat/ca.crt`\"]|" ${CONFIG_DIR}/$beat/$beat.yml
      fi

      KIBANAHOST=`ipconfig | grep "IPv4 Address" | sed 's/.*: //'`
      sed -i "s|host: "localhost:5601"|host: "${KIBANAHOST}:5601"|" ${CONFIG_DIR}/$beat/$beat.yml

      if [ "$beat" = "filebeat" ]; then
        sed -i "s|/var/log/\*\.log|`cygpath -m $INSTALL_DIR/elasticsearch/logs/elasticsearch-service-x64-stdout.*`|" $INSTALL_DIR/filebeat/filebeat.yml
      fi

      if [ "$beat" = "metricbeat" ]; then
        # only on Windows/zip we should remove the 'load' module from metricbeat
        sed -i 's/  - load//' $INSTALL_DIR/metricbeat/metricbeat.yml
      fi

      echo -e "\n-- `date` Load ${beat} index patterns, saves searches, visualizations, and dashboards"
      if [[ "$VERSION" > "6" ]]; then
        $INSTALL_DIR/${beat}/${beat} setup -e -c ${CONFIG_DIR}/${beat}/${beat}.yml
        sleep 5
      else
        pushd ${INSTALL_DIR}/${beat}/scripts/
        ./import_dashboards --insecure $AUTH -es ${ESURL} -url https://${BASEURL}/downloads/beats/beats-dashboards/beats-dashboards-${VERSION}${SNAPSHOT}.zip
        popd
      fi
      PowerShell.exe -ExecutionPolicy UnRestricted -File $INSTALL_DIR/${beat}/install-service-${beat}.ps1
      echo -e "\n-- `date` Start ${beat}"
      net start ${beat}
      sleep 5
      popd
    ); done
    ;;
esac
