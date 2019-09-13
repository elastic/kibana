#!/bin/bash
if [ -z "${CONFIG_DIR}" ]; then . ./envvars.sh; fi

# https://github.com/elastic/support-dev-help/issues/1674 was fixed
#echo console.proxyConfig: >> ${KIBANA_CONFIG}
#echo    - ssl.verify: false >> ${KIBANA_CONFIG}
echo logging.verbose: true  >> ${KIBANA_CONFIG}
echo uiSettings: >> ${KIBANA_CONFIG}
echo "    overrides:" >> ${KIBANA_CONFIG}
echo "        \"state:storeInSessionStorage\": true" >> ${KIBANA_CONFIG}
# For master 8.0 and later, IE will only work with this;
echo csp.strict: false >> ${KIBANA_CONFIG}

if [ $TLS = YES ]; then
  echo server.ssl.enabled: true >> ${KIBANA_CONFIG}
  # next setting is what Cloud uses
  echo elasticsearch.ssl.verificationMode: none  >> ${KIBANA_CONFIG}
  # CLoud also sets these
  # elasticsearch.preserveHost: true
  # xpack.security.secureCookies: true
  # xpack.reporting.capture.concurrency: 1
  # xpack.reporting.capture.loadDelay: 6000
  # xpack.monitoring.kibana.collection.enabled: true
fi


# security is disabled by default on trial license
# and enabled by default on Gold or Platinum license
if [[ "${SECURITY}" == "YES"  && ( "${LICENSE}" == "TRIAL"  ||  "${LICENSE}" == "BASIC" ) ]]; then
  echo xpack.security.enabled: true  >> ${KIBANA_CONFIG}
fi

if [ $XPACK = YES ]; then
  # setting elasticsearch username and pwd
  echo elasticsearch.username: kibana >> ${KIBANA_CONFIG}
  echo elasticsearch.password: $KIBANAPWD >> ${KIBANA_CONFIG}
  echo -e "\n-- `date` Add xpack.reporting.encryptionKey to kibana.yml"
  grep "^xpack.reporting.encryptionKey" ${KIBANA_CONFIG} || echo "xpack.reporting.encryptionKey: ThisIsReportingEncryptionKey1234" >> ${KIBANA_CONFIG}
  grep "^xpack.security.encryptionKey" ${KIBANA_CONFIG} || echo "xpack.security.encryptionKey: ThisIsSecurityEncryptionKey12345" >> ${KIBANA_CONFIG}

  # echo canvas.enabled: false >> ${KIBANA_CONFIG}
  echo # xpack.canvas.enabled: false >> ${KIBANA_CONFIG}
  # prevent needless timeouts (defaults 30000, 6000);
  echo xpack.reporting.queue.timeout: 180000 >> ${KIBANA_CONFIG}
  # echo xpack.reporting.capture.timeout: 12000 >> ${KIBANA_CONFIG} -- DEPRECATED

  # enable experimental setting in 6.2
  # if [ -n "${xpack_reporting_capture_browser_type}" ]; then
  #   if [ ${xpack_reporting_capture_browser_type} = chromium ]; then
  #     echo xpack.reporting.capture.browser.type: chromium >> ${KIBANA_CONFIG}
  #   fi
  # fi
  # # at least on CentOS 7, we have to disableSandbox for it to work
  # if [ -n "${xpack_reporting_capture_browser_chromium_disableSandbox}" ]; then
  #   if [ ${xpack_reporting_capture_browser_chromium_disableSandbox} = true ]; then
  #     echo xpack.reporting.capture.browser.chromium.disableSandbox: true >> ${KIBANA_CONFIG}
  #   fi
  # fi

fi

echo -e "\n-- `date` Start kibana service"
case $PACKAGE in
  deb|rpm)
    KIBANA_LOG=/var/log/kibana/kibana.stdout
    echo elasticsearch.hosts: $ESURL >> ${KIBANA_CONFIG}
    if [ "${VM}" == "ubuntu16_deb_desktop_saml" ]; then
      echo server.xsrf.whitelist: [/api/security/v1/saml] >> ${KIBANA_CONFIG}
      echo xpack.security.authc.providers: [saml,basic] >> ${KIBANA_CONFIG}
      echo xpack.security.authc.saml.realm: saml1 >> ${KIBANA_CONFIG}
      # echo xpack.security.authProviders: [saml] >> ${KIBANA_CONFIG}
      # # https://github.com/elastic/kibana/issues/23521
      # echo xpack.reporting.capture.browser.type: chromium >> ${KIBANA_CONFIG}
      # Keep default localhost for SAML config
    else
      echo -e "\n-- `date` Set network.host for Kibana so we can access it outside the vagrant machine"
      grep "^server.host: 0.0.0.0" ${KIBANA_CONFIG} || echo "server.host: 0.0.0.0" >> ${KIBANA_CONFIG}
    fi

    if [ "${VM}" == "ubuntu16_deb_desktop_oidc" ] || [ "${VM}" == "ubuntu18_deb_oidc" ]; then
      # echo elasticsearch.hosts: $ESURL >> ${KIBANA_CONFIG}
      echo server.xsrf.whitelist: [/api/security/v1/oidc] >> ${KIBANA_CONFIG}
      echo xpack.security.authc.providers: [oidc,basic] >> ${KIBANA_CONFIG}
	  echo xpack.security.authc.oidc.realm: oidc1 >> ${KIBANA_CONFIG}
      echo xpack.reporting.capture.browser.type: chromium >> ${KIBANA_CONFIG}
	fi

    if [ "${VM}" == "ubuntu16_deb_desktop_krb" ]; then
      # echo elasticsearch.hosts: $ESURL >> ${KIBANA_CONFIG}
      echo xpack.security.authc.providers: [kerberos,basic] >> ${KIBANA_CONFIG}
	  #echo xpack.security.authc.token.enabled: True >> ${KIBANA_CONFIG}
	fi


    if [ $TLS = YES ]; then
      cp ${QADIR}/../certs/kibana/* ${CONFIG_DIR}/kibana/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/kibana/
      echo server.ssl.certificate: ${CONFIG_DIR}/kibana/kibana.crt >> ${KIBANA_CONFIG}
      echo server.ssl.key: ${CONFIG_DIR}/kibana/kibana.key >> ${KIBANA_CONFIG}
      echo elasticsearch.ssl.certificateAuthorities: [\"${CONFIG_DIR}/kibana/ca.crt\"] >> ${KIBANA_CONFIG}
    fi
    service kibana start
    ;;
  tar.gz)
    KIBANA_LOG=${INSTALL_DIR}/kibana/logs/kibana.stdout
    echo -e "\n-- `date` Set network.host for Kibana so we can access it outside the vagrant machine (only on VMs?)"
    grep "^server.host: 0.0.0.0" ${KIBANA_CONFIG} || echo "server.host: 0.0.0.0" >> ${KIBANA_CONFIG}
    grep "^logging.dest" ${KIBANA_CONFIG} || echo logging.dest: ${KIBANA_LOG} >> ${KIBANA_CONFIG}
    if [ $TLS = YES ]; then
      cp ${QADIR}/../certs/kibana/* ${CONFIG_DIR}/kibana/config/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/kibana/config/
      echo server.ssl.certificate: ${CONFIG_DIR}/kibana/config/kibana.crt >> ${KIBANA_CONFIG}
      echo server.ssl.key: ${CONFIG_DIR}/kibana/config/kibana.key >> ${KIBANA_CONFIG}
      echo elasticsearch.ssl.certificateAuthorities: [\"${CONFIG_DIR}/kibana/config/ca.crt\"] >> ${KIBANA_CONFIG}
    fi
    su vagrant -c "mkdir ${CONFIG_DIR}/kibana/logs"
    if [ "$VM" = "ubuntu16_tar_ccs" ]; then
      cp -R ${CONFIG_DIR}/kibana ${CONFIG_DIR}/kibana_data
      echo server.port: 5602 >> ${CONFIG_DIR}/kibana_data/config/kibana.yml
      echo elasticsearch.hosts: $ESURLDATA >> ${CONFIG_DIR}/kibana_data/config/kibana.yml
      sed -i 's|/kibana/|/kibana_data/|' ${CONFIG_DIR}/kibana_data/config/kibana.yml
      chown -R vagrant:vagrant ${CONFIG_DIR}/kibana_data
      su vagrant -c "nohup $INSTALL_DIR/kibana_data/bin/kibana > $INSTALL_DIR/kibana_data/logs/kibana.log &"
    fi
    echo elasticsearch.hosts: $ESURL >> ${KIBANA_CONFIG}
    su vagrant -c "nohup $INSTALL_DIR/kibana/bin/kibana > $INSTALL_DIR/kibana/logs/kibana.log &"
    ;;
  zip)
    set -x
    #grep "^server.host: 0.0.0.0" ${KIBANA_CONFIG} || echo "server.host: 0.0.0.0" >> ${KIBANA_CONFIG}
    set +e
    KIBANA_LOG=${INSTALL_DIR}/kibana/log/kibana.stdout
    echo elasticsearch.hosts: $ESURL >> ${KIBANA_CONFIG}
    if [ $TLS = YES ]; then
      cp ${QADIR}/../certs/kibana/* ${CONFIG_DIR}/kibana/config/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/kibana/config/
      echo server.ssl.certificate: ./config/kibana.crt >> ${KIBANA_CONFIG}
      echo server.ssl.key: ./config/kibana.key >> ${KIBANA_CONFIG}
      echo elasticsearch.ssl.certificateAuthorities: [\"./config/ca.crt\"] >> ${KIBANA_CONFIG}
    fi
	KIBANAHOST=`ipconfig | grep "IPv4 Address" | sed 's/.*: //'`

    echo "server.host: ${KIBANAHOST}" >> ${KIBANA_CONFIG}
    # grep "^server.host: 0.0.0.0" ${KIBANA_CONFIG} || echo "server.host: 0.0.0.0" >> ${KIBANA_CONFIG} ** This would break reporting on Windows **
    #echo logging.dest: "./log/kibana.stdout" >> ${KIBANA_CONFIG}
    mkdir -p $INSTALL_DIR/kibana/log

    NSSM_EXE=`find /c/ProgramData/chocolatey/lib/NSSM/ -name nssm.exe*`
    ${NSSM_EXE} install kibana $INSTALL_DIR/kibana/bin/kibana.bat
    ${NSSM_EXE} set kibana AppDirectory $INSTALL_DIR/kibana
    ${NSSM_EXE} set kibana AppStdout $INSTALL_DIR/kibana/log/kibana.stdout
    nssm start kibana
    ;;
esac

# Install kibana x-pack as kibana user instead of this.  This causes another long optimize.
# if [ $PACKAGE = rpm ] && [ $XPACK = YES ]; then
#   # https://github.com/elastic/kibana/issues/8818
#   chown -R kibana:kibana ${INSTALL_DIR}/kibana/optimize/*
# fi


set -x
echo -e "\n `date`----------- Wait for elasticsearch plugin status in Kibana to be green ----------------"
set +e
for i in `seq 1 30`; do
  echo "${i} `date` check kibana status api for state 'green' in curl -k ${KIBANAURL}/api/status"
  curl -k ${KIBANAURL}/api/status > /tmp/tempcurl 2>&1
  curl -k https://elastic:changeit@10.0.2.15:5601/api/status >> /tmp/tempcurl 2>&1
  curl -k http://elastic:changeit@10.0.2.15:5601/api/status >> /tmp/tempcurl 2>&1
  curl -k https://elastic:changeit@localhost:5601/api/status >> /tmp/tempcurl 2>&1
  grep "\"state\":\"green\"" /tmp/tempcurl && break
  grep -i "fatal" $KIBANA_LOG
  grep -i "fatal" $KIBANA_LOG && break
  grep -i "optimiz" $KIBANA_LOG
  sleep 30
done
set -e
grep "\"state\":\"green\"" /tmp/tempcurl || cat $KIBANA_LOG
grep "\"state\":\"green\"" /tmp/tempcurl

# always do it so we can always test with IE
# if [ "${VMOS}" = "windows" ]; then
#  sleep 5
#  echo "enable storeInSessionStorage (really should be based on IE browser, not Windows platform for the server)"
#  curl -k -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" -d '{"changes":{"state:storeInSessionStorage":true}}' -u ${KIBANASERVERUSER}:${KIBANAPWD} "${ESPROTO}://${KIBANAIP}:5601/api/kibana/settings" > tempcurl 2>&1
#  cat tempcurl
#  grep -F '"state:storeInSessionStorage":{"userValue":true}' tempcurl
# fi
