#!/bin/bash
if [ -z "${CONFIG_DIR}" ]; then . ./envvars.sh; fi


echo -e "\n-- `date` Configure Logstash"


case $PACKAGE in
  deb)
    chmod o+r /var/log/syslog
    cp $QADIR/../config/logstash.conf ${LOGSTASH_CONFIG} || exit 1
    if [ $TLS = YES ]; then
      sed -i "s|#cacert.*|cacert => \"${LOGSTASH_YML_DIR}/ca.crt\"|" ${LOGSTASH_CONFIG}
      echo xpack.monitoring.elasticsearch.ssl.certificate_authority: "${LOGSTASH_YML_DIR}/ca.crt" >> ${LOGSTASH_YML_DIR}/logstash.yml
    fi
    ;;
  rpm)
    chmod o+r /var/log/messages
    cp $QADIR/../config/logstash.conf ${LOGSTASH_CONFIG} || exit 1
    sed -i 's|path => "/var/log/syslog"|path => "/var/log/messages"|' ${LOGSTASH_CONFIG}
    if [ $TLS = YES ]; then
      sed -i "s|#cacert.*|cacert => \"${LOGSTASH_YML_DIR}/ca.crt\"|" ${LOGSTASH_CONFIG}
      echo xpack.monitoring.elasticsearch.ssl.certificate_authority: "${LOGSTASH_YML_DIR}/ca.crt" >> ${LOGSTASH_YML_DIR}/logstash.yml
    fi
    ;;
  tar.gz)
    cp $QADIR/../config/logstash.conf ${LOGSTASH_CONFIG} || exit 1
    if [ -f /var/log/messages ]; then
      chmod o+r /var/log/messages
      sed -i 's|path => "/var/log/syslog"|path => "/var/log/messages"|' ${LOGSTASH_CONFIG}
    else
      chmod o+r /var/log/syslog
    fi
    if [ $TLS = YES ]; then
      sed -i "s|#cacert.*|cacert => \"${LOGSTASH_YML_DIR}/ca.crt\"|" ${LOGSTASH_CONFIG}
      echo xpack.monitoring.elasticsearch.ssl.certificate_authority: "${LOGSTASH_YML_DIR}/ca.crt" >> ${LOGSTASH_YML_DIR}/logstash.yml
    fi
    ;;
  zip)
    cp $QADIR/../config/logstash.conf ${INSTALL_DIR}/logstash/config/logstash.conf
    echo path.config: config/logstash.conf >> ${LOGSTASH_YML_DIR}/logstash.yml
    sed -i "s|path => \"/var/log/syslog\"|path => \"`cygpath -m $INSTALL_DIR/elasticsearch/logs/elasticsearch.log`\"|" ${LOGSTASH_CONFIG}
    if [ $TLS = YES ]; then
      sed -i "s|#cacert.*|cacert => \"./config/ca.crt\"|" ${LOGSTASH_CONFIG}
      echo xpack.monitoring.elasticsearch.ssl.certificate_authority: "./config/ca.crt" >> ${LOGSTASH_YML_DIR}/logstash.yml
     fi
    ;;
esac


sed -i "s|localhost:9200|${ESPROTO}://${ESHOST}:${ESPORT}|" ${LOGSTASH_CONFIG}

if [ $TLS = YES ]; then
  echo -e "\n-- `date` Configure logstash for SSL"
  cp ${QADIR}/../certs/kibana/* ${LOGSTASH_YML_DIR}/
  cp ${QADIR}/../certs/ca/* ${LOGSTASH_YML_DIR}/

  sed -i 's|#ssl.*|ssl => true|' ${LOGSTASH_CONFIG}
  # sed -i "s|#cacert.*|cacert => \"${LOGSTASH_YML_DIR}/ca.crt\"|" ${LOGSTASH_CONFIG}

  echo -e "\n-- `date` configure Logstash X-Pack monitoring - https://github.com/elastic/x-pack-elasticsearch/issues/1116"
  echo xpack.monitoring.elasticsearch.hosts: ${ESPROTO}://${ESHOST}:${ESPORT} >> ${LOGSTASH_YML_DIR}/logstash.yml
  echo xpack.monitoring.elasticsearch.username: "logstash_system" >> ${LOGSTASH_YML_DIR}/logstash.yml
  echo xpack.monitoring.elasticsearch.password: "changeit" >> ${LOGSTASH_YML_DIR}/logstash.yml
fi

  case $PACKAGE in
    deb|rpm)

      if [[ `grep CentOS /etc/system-release` =~ "release 6." ]]; then
        initctl start logstash
      else
        service logstash start
      fi

      logger testing
      logger "some log messages"
      ;;
    tar.gz)
      su vagrant -c "mkdir $INSTALL_DIR/logstash/logs"
      su vagrant -c "nohup $INSTALL_DIR/logstash/bin/logstash -f $INSTALL_DIR/logstash/config/logstash.conf > $INSTALL_DIR/logstash/logs/logstash.log &"
      ;;
    zip)
      # Start Logstash
      pushd $INSTALL_DIR/logstash
      mkdir $INSTALL_DIR/logstash/logs
      NSSM_EXE=`find /c/ProgramData/chocolatey/lib/NSSM/ -name nssm.exe*`
      ${NSSM_EXE} install logstash $INSTALL_DIR/logstash/bin/logstash.bat
      ${NSSM_EXE} set logstash AppDirectory $INSTALL_DIR/logstash
      ${NSSM_EXE} set logstash AppStdout $INSTALL_DIR/logstash/logs/logstash.stdout
      nssm start logstash
      popd

      ;;
  esac
