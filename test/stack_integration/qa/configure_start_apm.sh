#!/bin/bash
if [ -z "${CONFIG_DIR}" ]; then . ./envvars.sh; fi

# https://www.elastic.co/guide/en/apm/get-started/current/install-and-run.html
mv ${CONFIG_DIR}/apm-server/apm-server.yml ${CONFIG_DIR}/apm-server/apm-server.yml.original
if [ $TLS = YES ]; then
  \cp ../config/apm-server-ssl.yml ${CONFIG_DIR}/apm-server/apm-server.yml
  cp ${QADIR}/../certs/elasticsearch/* ${CONFIG_DIR}/apm-server/
  cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/apm-server/
else
  \cp ../config/apm-server.yml ${CONFIG_DIR}/apm-server/apm-server.yml
fi


echo -e "\n-- `date` Start apm-server service"
case $PACKAGE in
  deb|rpm)
    # if [ $SECURITY = YES ]; then
    #   sed -i "s|ssl.certificate_authorities:.*|ssl.certificate_authorities: [\"${CONFIG_DIR}/apm-server/ca.crt\"]|" ${CONFIG_DIR}/apm-server/apm-server.yml
    #   sed -i "s|ssl.certificate:.*|ssl.certificate: ${CONFIG_DIR}/apm-server/elasticsearch.crt|" ${CONFIG_DIR}/apm-server/apm-server.yml
    #   sed -i "s|ssl.key:.*|ssl.key: ${CONFIG_DIR}/apm-server/elasticsearch.key|" ${CONFIG_DIR}/apm-server/apm-server.yml
    # fi
    service apm-server start
    ;;
  tar.gz)
    if [ $TLS = YES ]; then
      sed -i "s|ssl.certificate_authorities:.*|ssl.certificate_authorities: [\"${CONFIG_DIR}/apm-server/ca.crt\"]|" ${CONFIG_DIR}/apm-server/apm-server.yml
      sed -i "s|ssl.certificate:.*|ssl.certificate: ${CONFIG_DIR}/apm-server/elasticsearch.crt|" ${CONFIG_DIR}/apm-server/apm-server.yml
      sed -i "s|ssl.key:.*|ssl.key: ${CONFIG_DIR}/apm-server/elasticsearch.key|" ${CONFIG_DIR}/apm-server/apm-server.yml
    fi
    su vagrant -c "nohup $INSTALL_DIR/apm-server/apm-server -e --path.config ${CONFIG_DIR}/apm-server/ &"
    ;;
  zip)
    set -x
    if [ $TLS = YES ]; then
      sed -i "s|ssl.certificate: .*|ssl.certificate: "`cygpath -m ${CONFIG_DIR}/apm-server/elasticsearch.crt`"|" ${CONFIG_DIR}/apm-server/apm-server.yml
      sed -i "s|ssl.key: .*|ssl.key: "`cygpath -m ${CONFIG_DIR}/apm-server/elasticsearch.key`"|" ${CONFIG_DIR}/apm-server/apm-server.yml
      sed -i "s|ssl.certificate_authorities: .*|ssl.certificate_authorities: [\"`cygpath -m ${CONFIG_DIR}/apm-server/ca.crt`\"]|" ${CONFIG_DIR}/apm-server/apm-server.yml
    fi
	sed -i "s|localhost:5601|10.0.2.15:5601|" ${CONFIG_DIR}/apm-server/apm-server.yml

    # mkdir -p $INSTALL_DIR/apm-server/log
    PowerShell.exe -ExecutionPolicy UnRestricted -File $INSTALL_DIR/apm-server/install-service-apm-server.ps1
    echo -e "\n-- `date` Start apm-server"
    net start apm-server
    sleep 5
    ;;
esac

if [ ! -f events.ndjson ]; then
  wget https://raw.githubusercontent.com/elastic/apm-server/7.0/testdata/intake-v2/events.ndjson
fi
sleep 40
set +e
curl -i -H "Content-type: application/x-ndjson" --data-binary @events.ndjson http://localhost:8200/intake/v2/events
