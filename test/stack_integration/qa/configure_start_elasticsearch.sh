#!/bin/bash
if [ -z "${CONFIG_DIR}" ]; then . ./envvars.sh; fi

echo -e "\n-- `date` Configure and start Elasticsearch"
set -x

echo network.host: 0.0.0.0 >> ${ES_CONFIG}
echo discovery.type: single-node >> ${ES_CONFIG}
# echo cluster.initial_master_nodes: 0.0.0.0 >> ${ES_CONFIG}
if [ $LICENSE == TRIAL ]; then
  echo xpack.license.self_generated.type: trial >> ${ES_CONFIG}
fi

if [ "${VM}" == "ubuntu16_deb_desktop_saml" ]; then
  cat ${QADIR}/../config/saml_elasticsearch.yml >> ${ES_CONFIG}
  cp ${QADIR}/../config/auth0-kibana-metadata.xml ${CONFIG_DIR}/elasticsearch/
  cp ${QADIR}/../certs/saml/* ${CONFIG_DIR}/elasticsearch/
fi


if [ "${VM}" == "ubuntu16_deb_desktop_oidc" ]; then
  cat ${QADIR}/../config/oidc_elasticsearch.yml >> ${ES_CONFIG}
fi

if [ "${VM}" == "ubuntu18_deb_oidc" ]; then
  cat ${QADIR}/../config/oidc_elasticsearch.yml >> ${ES_CONFIG}
fi

if [ "${VM}" == "ubuntu16_deb_desktop_krb" ]; then
  cat ${QADIR}/../config/kerberos_elasticsearch.yml >> ${ES_CONFIG}
  echo '-Djava.security.krb5.conf=/etc/krb5.conf' >> /etc/elasticsearch/jvm.options
  cp /etc/krb5.keytab ${CONFIG_DIR}/elasticsearch/
fi

if [ "${XPACK}" = "YES" ]; then

cat <<-ESXPACK >> ${ES_CONFIG}
# discovery.zen.minimum_master_nodes: 0
# xpack.security.authc.token.enabled: false (not sure why we had this set to false)
xpack.notification.email.account:
  gmail_account:
    profile: gmail
    smtp:
      auth: true
      starttls.enable: true
      host: smtp.mailgun.org
      port: 587
      user: infra@elastic.co
#     secure_password: pizza-loggia-upkeep
#
# enable audit logging;
xpack.security.audit.enabled: true
#xpack.security.audit.outputs: index
xpack.security.audit.logfile.events.emit_request_body: true
ESXPACK
fi

# security is disabled by default on trial license
# and enabled by default on Gold or Platinum license
if [[ "${SECURITY}" == "YES"  && ( "${LICENSE}" == "TRIAL"  ||  "${LICENSE}" == "BASIC" ) ]]; then
  echo xpack.security.enabled: true  >> ${ES_CONFIG}
fi

case $PACKAGE in
  deb|rpm)
set -x
echo "VERSION = $VERSION"

# export JAVA_HOME=/usr/share/elasticsearch/jdk

# echo "*********** WARNING REMOVE THIS chmod 777 WORK-AROUND *********** ISSUE https://github.com/elastic/elasticsearch/issues/41726"
# chmod 777 /etc/elasticsearch


    if [ $XPACK = YES ]; then
      # always add the mailgun cert so we can send watcher emails
      cp ${QADIR}/../certs/mailgun/mailgun.crt ${CONFIG_DIR}/elasticsearch/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/elasticsearch/
      if [ $TLS = YES ]; then
        echo 'xpack.security.http.ssl.certificate_authorities: ["./ca.crt", "./mailgun.crt"]' >> ${ES_CONFIG}
        echo 'xpack.http.ssl.certificate_authorities: ["./ca.crt", "./mailgun.crt"]' >> ${ES_CONFIG}
        cp ${QADIR}/../certs/elasticsearch/* ${CONFIG_DIR}/elasticsearch/
        echo xpack.security.http.ssl.certificate: ./elasticsearch.crt >> ${ES_CONFIG}
        echo xpack.security.http.ssl.key: ./elasticsearch.key >> ${ES_CONFIG}
        echo xpack.http.ssl.verification_mode: none >> ${ES_CONFIG}

        echo xpack.security.authc.token.enabled: true >> ${ES_CONFIG}
        echo xpack.security.http.ssl.enabled: true >> ${ES_CONFIG}

        echo xpack.security.transport.ssl.enabled: true >> ${ES_CONFIG}
        echo # xpack.security.transport.ssl.verification_mode: certificate >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.verification_mode: none >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.key: ./elasticsearch.key >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.certificate: ./elasticsearch.crt >> ${ES_CONFIG}
        # echo xpack.security.transport.ssl.certificate_authorities: [ "./ca.crt" ] >> ${ES_CONFIG}
        echo 'xpack.security.transport.ssl.certificate_authorities: [ "./ca.crt" ]' >> ${ES_CONFIG}
		if [ "$VM" = "ubuntu18_deb_oidc" ]; then
			# needed for OIDC SSO
			echo 42KvS0oWF4QZx94UqTAxNR2HuZLFoL_pgX8Kk_V8kk50qXbHI2TXKSXNm0bm10mt | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add "xpack.security.authc.realms.oidc.oidc1.rp.client_secret"
		fi
      else
        echo 'xpack.security.http.ssl.certificate_authorities: ["./mailgun.crt"]' >> ${ES_CONFIG}
      fi

      ls /etc/elasticsearch/elasticsearch.keystore || $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore create
      echo "echo changeit | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add "bootstrap.password""
      echo changeit | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add "bootstrap.password"
	  echo "echo pizza-loggia-upkeep | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add "xpack.notification.email.account.gmail_account.smtp.secure_password""
	  echo pizza-loggia-upkeep | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add "xpack.notification.email.account.gmail_account.smtp.secure_password"
      # I suppose this is owned by root and so the elasticsearch user can't
      # read it unless we chown or chmod it
      chmod 777 $CONFIG_DIR/elasticsearch/elasticsearch.keystore
    fi

    if [[ `grep CentOS /etc/system-release` =~ "release 6." ]]; then
      echo bootstrap.system_call_filter: false >> ${ES_CONFIG}
    fi

    service elasticsearch start
    ;;
  tar.gz)
    ########## what to do for tar.gz and zip installs?  Not needed for Windows/zip
    # This might ONLY be needed for the tar.gz case?
    grep "Xms" ${CONFIG_DIR}/elasticsearch/config/jvm.options
    # On 6.x, Xms is set to 1G so the sed command below doesn't do anything
    if ! [[ `uname -s` =~ .*NT.* ]]; then
      echo -e "\n-- `date` set jvm min heap size"
      sed -i 's/-Xms256m/-Xms2g/' ${CONFIG_DIR}/elasticsearch/config/jvm.options
    fi

    sysctl -w vm.max_map_count=262144
    ulimit -n 65536
    sudo echo "*    soft nofile 65536" >> /etc/security/limits.conf
    sudo echo "*    hard nofile 65536" >> /etc/security/limits.conf

    if [ $XPACK = YES ]; then
      # always add the mailgun cert so we can send watcher emails
      cp ${QADIR}/../certs/mailgun/mailgun.crt ${CONFIG_DIR}/elasticsearch/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/elasticsearch/
	        cp ${QADIR}/../certs/mailgun/mailgun.crt ${CONFIG_DIR}/elasticsearch/config/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/elasticsearch/config/
      su vagrant -c "$INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore create"
      su vagrant -c "echo pizza-loggia-upkeep | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add \"xpack.notification.email.account.gmail_account.smtp.secure_password\""
      if [ $TLS = YES ]; then
        echo "CONFIGURING TLS"
        echo xpack.security.http.ssl.certificate_authorities: ["./ca.crt", "./mailgun.crt"] >> ${ES_CONFIG}
        echo xpack.http.ssl.certificate_authorities: ["./ca.crt", "./mailgun.crt"] >> ${ES_CONFIG}
        cp ${QADIR}/../certs/elasticsearch/* ${CONFIG_DIR}/elasticsearch/config/
        echo xpack.security.http.ssl.certificate: ./elasticsearch.crt >> ${ES_CONFIG}
        echo xpack.security.http.ssl.key: ./elasticsearch.key >> ${ES_CONFIG}
        echo xpack.http.ssl.verification_mode: none >> ${ES_CONFIG}

        echo xpack.security.authc.token.enabled: true >> ${ES_CONFIG}
        echo xpack.security.http.ssl.enabled: true >> ${ES_CONFIG}

        echo xpack.security.transport.ssl.enabled: true >> ${ES_CONFIG}
        echo # xpack.security.transport.ssl.verification_mode: certificate >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.verification_mode: none >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.key: ./elasticsearch.key >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.certificate: ./elasticsearch.crt >> ${ES_CONFIG}
        echo xpack.security.transport.ssl.certificate_authorities: [ "./ca.crt" ] >> ${ES_CONFIG}

        if [ $XPACK = YES ]; then
          ls ${CONFIG_DIR}/elasticsearch/elasticsearch.keystore || su vagrant -c "$INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore create"
          su vagrant -c "echo changeit | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore add \"bootstrap.password\""
        fi
      else
        echo xpack.security.http.ssl.certificate_authorities: ["./mailgun.crt"] >> ${ES_CONFIG}
      fi
    fi

    if [ "$VM" = "ubuntu16_tar_ccs" ]; then

      # copy elasticsearch to another directory for a "data" cluster to use
      # with Cross Cluster Search
      cp -R $INSTALL_DIR/elasticsearch $INSTALL_DIR/elasticsearch_data
      echo cluster.name: admin >> ${ES_CONFIG}

      # echo transport.tcp.port: 9300 >> ${ES_CONFIG}
      echo transport.port: 9300 >> ${ES_CONFIG}
      echo http.port: 9200 >> ${ES_CONFIG}

      echo cluster.name: data >> ${CONFIG_DIR}/elasticsearch_data/config/elasticsearch.yml
      # echo transport.tcp.port: 9310 >> ${CONFIG_DIR}/elasticsearch_data/config/elasticsearch.yml
      echo transport.port: 9310 >> ${CONFIG_DIR}/elasticsearch_data/config/elasticsearch.yml
      echo http.port: 9210 >> ${CONFIG_DIR}/elasticsearch_data/config/elasticsearch.yml

      chown -R vagrant:vagrant $INSTALL_DIR/*

      su vagrant -c "nohup $INSTALL_DIR/elasticsearch_data/bin/elasticsearch > $INSTALL_DIR/elasticsearch_data/logs/elasticsearch.log &"
    fi
    chown -R vagrant:vagrant $INSTALL_DIR/*

    # start the main ADMIN cluster
    su vagrant -c "nohup $INSTALL_DIR/elasticsearch/bin/elasticsearch  > $INSTALL_DIR/elasticsearch/logs/elasticsearch.log &"

    ;;
  zip)
    if [ $XPACK = YES ]; then

      # always add the mailgun cert so we can send watcher emails
      cp $QADIR/../certs/mailgun/mailgun.crt ${CONFIG_DIR}/elasticsearch/config/
      cp ${QADIR}/../certs/ca/* ${CONFIG_DIR}/elasticsearch/config/
      if [ $TLS = YES ]; then
        echo xpack.security.http.ssl.certificate_authorities: ["ca.crt", "mailgun.crt"] >> ${ES_CONFIG}
        echo xpack.http.ssl.certificate_authorities: ["ca.crt", "mailgun.crt"] >> ${ES_CONFIG}
        cp ${QADIR}/../certs/elasticsearch/* ${CONFIG_DIR}/elasticsearch/config/

cat <<ESZIP >> ${ES_CONFIG}
# xpack.security.transport.ssl.enabled: true
# xpack.security.transport.ssl.verification_mode: certificate
# xpack.security.transport.ssl.verification_mode: none
# xpack.security.transport.ssl.key: elasticsearch.key
# xpack.security.transport.ssl.certificate: elasticsearch.crt
# xpack.security.transport.ssl.certificate_authorities: [ "ca.crt" ]

xpack.security.http.ssl.certificate: elasticsearch.crt
xpack.security.http.ssl.key: elasticsearch.key
xpack.security.http.ssl.enabled: true
ESZIP
      else
        echo xpack.security.http.ssl.certificate_authorities: ["mailgun.crt"] >> ${ES_CONFIG}
      fi
    fi

    # I don't know if I can add something to the elasticsearch.yml so the temp dir
    # is in the ${CONFIG_DIR}, or if it has to do with the service configuration?
    mkdir /c/Users/vagrant/AppData/Local/Temp/elasticsearch


    echo "path.logs: `cygpath -w $INSTALL_DIR/elasticsearch/logs/`" >> ${ES_CONFIG}

    start netsh advfirewall set allprofiles state off
    pushd $INSTALL_DIR/elasticsearch/
    if [[ "$VERSION" > "6" ]] && [ $XPACK = YES ]; then
      # bin/elasticsearch-keystore${DOTBAT} create
      echo changeit | bin/elasticsearch-keystore${DOTBAT} add "bootstrap.password"
      echo pizza-loggia-upkeep | $INSTALL_DIR/elasticsearch/bin/elasticsearch-keystore${DOTBAT} add "xpack.notification.email.account.gmail_account.smtp.secure_password"
    fi
    bin/elasticsearch-service.bat install
    net start elasticsearch-service-x64
    sleep 10
    popd
    ;;
esac

echo -e "\n `date`------------wait for Elasticsearch to be up with new password ----------------------------"
for i in `seq 1 30`; do echo "curl es index $ESURL" && sleep 6 && curl -k -s $ESURL | grep number && break; done
curl -k $ESURL | grep number || echo Failed to find $ESURL
curl -k $ESURL | grep number || exit 1
if [ "$VM" = "ubuntu16_deb_desktop_krb" ]; then
	#rolemapping for kerberos
	curl --insecure -XPUT "$ESURL/_security/role_mapping/kerbrolemapping?pretty" -H 'Content-Type: application/json' -d '{ "roles": [ "superuser" ], "enabled": true, "rules": {"field": { "username": "tester@TEST.ELASTIC.CO" }}}'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl

fi

if [ "$VM" = "ubuntu16_tar_ccs" ]; then
  echo -e "\n `date`------------wait for Elasticsearch remote to be up so we can change password----------------------------"
  for i in `seq 1 30`; do echo "curl es index $ESURLDATA" && sleep 6 && curl -k -s $ESURLDATA | grep number && break; done
  curl -k $ESURLDATA | grep number || echo Failed to find $ESURLDATA
  curl -k $ESURLDATA | grep number || exit 1
  if [ "${SECURITY}" = "YES" ]; then
    curl -k -XPUT --basic "$ESURLDATA/_xpack/security/user/elastic/_password?pretty" -H 'Content-Type: application/json' -d '{ "password": "changeit" }'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl
  fi

  # Enable local cluster to Cross-Cluster Search data
  # "local" = admin, "data" = remote
  curl --insecure -XPUT $ESURL/_cluster/settings  -H 'Content-Type: application/json' -d '{
    "persistent" : {
      "cluster" : {
        "remote" : {
          "data" : {
            "skip_unavailable" : "true",
            "seeds" : [
              "localhost:9310"
            ]
          },
          "local" : {
            "skip_unavailable" : "true",
            "seeds" : [
              "localhost:9300"
            ]
          }
        }
      },
      "xpack" : {
        "monitoring" : {
          "collection" : {
            "enabled" : "true"
          }
        }
      }
    },
    "transient" : { }
  }'

  echo -e "\n"

  # Enable remote data cluster to follow indices in local cluster
  # "local" = admin, "data" = remote
  curl --insecure -XPUT $ESURLDATA/_cluster/settings  -H 'Content-Type: application/json' -d '{
    "persistent" : {
      "cluster" : {
        "remote" : {
          "data" : {
            "skip_unavailable" : "true",
            "seeds" : [
              "localhost:9310"
            ]
          },
          "local" : {
            "skip_unavailable" : "true",
            "seeds" : [
              "localhost:9300"
            ]
          }
        }
      },
      "xpack" : {
        "monitoring" : {
          "collection" : {
            "enabled" : "true"
          }
        }
      }
    },
    "transient" : { }
  }'

  echo -e "\n"

  # Set up for CCR Cross Cluster Replication (https://gist.github.com/sebelga/c88c83ac625a38170f9feffcf0bad60f)
  # curl --insecure -XPUT $ESURL/makelogs%e5%b7%a5%e7%a8%8b-0  -H 'Content-Type: application/json' -d '{
  #   "index" : {
  #           "number_of_shards" : 1,
  #           "number_of_replicas" : 1,
  #            "soft_deletes": {
  #              "enabled" : true
  #            }
  #       }
  # }'
  # echo -e "\n"

  # seems like now we have to do this step AFTER we've written data to makelogs-0 ?
  # curl --insecure -XPUT $ESURLDATA/makelogs-0_f/_ccr/follow  -H 'Content-Type: application/json' -d '{
  #   "remote_cluster" : "local",
  #   "leader_index" : "makelogs-0"
  # }'
  # echo -e "\n"


fi
