#!/bin/bash
set -e

# cd to the qa/ dir where this script lives
cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=$PWD

. ./envvars.sh
# set -x
if [ -f phase2.marker ]; then rm phase2.marker; fi

# if [ $SECURITY = YES ]; then
  . ./install_certificates.sh
# fi

if [ "${ESHOST}" = "localhost" ]; then
  . ./configure_start_elasticsearch.sh

  . ./install_license.sh

  if [ $SECURITY = YES ]; then
    curl -k -XPUT --basic "$ESURL/_xpack/security/user/kibana/_password?pretty" -H 'Content-Type: application/json' -d'
    { "password": "changeit" }'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl

    curl -k -XPUT --basic "$ESURL/_xpack/security/user/logstash_system/_password?pretty" -H 'Content-Type: application/json' -d'
    { "password": "changeit" }'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl

    if [ "${VM}" == "ubuntu16_deb_desktop_saml" ]; then
      echo -e "\n-- `date` map saml groups to Elasticsearch roles"
      ./saml_role_mapping.sh
    elif [ "${VM}" == "ubuntu16_deb_desktop_oidc" ] || [ "${VM}" == "ubuntu18_deb_oidc" ]; then
      echo -e "\n-- `date` map OpenIDConnect groups to Elasticsearch roles"
      ./oidc_role_mapping.sh	
      # ./setup_firefox_testing.sh
    fi

  fi


. ./configure_start_kibana.sh


# this is the end of the local elasticsearch and kibana config/start
# which is not used when testing against a Cloud instance
fi

if [ $SECURITY = YES ]; then
  echo -e "\n-- `date` Create all users and roles"
  cat users_roles.txt | while read line; do ./create_roles_users.sh $ESURL $line; done

  if [ "$VM" = "ubuntu16_tar_ccs" ]; then
    curl -k -XPUT --basic "$ESURLDATA/_xpack/security/user/kibana/_password?pretty" -H 'Content-Type: application/json' -d'
    { "password": "changeit" }'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl

    curl -k -XPUT --basic "$ESURLDATA/_xpack/security/user/logstash_system/_password?pretty" -H 'Content-Type: application/json' -d'
    { "password": "changeit" }'> /tmp/tempcurl 2>&1
    cat /tmp/tempcurl
    cat users_roles.txt | while read line; do ./create_roles_users.sh $ESURLDATA $line; done
  fi
fi

if [[ $PRODUCTS =~ .*logstash.* ]]; then
  . ./configure_start_logstash.sh
fi

echo -e "\n-- `date` Configure beats authentication"
. ./configure_start_beats.sh

if [[ $PRODUCTS =~ .*apm-server.* ]]; then
  . ./configure_start_apm.sh
fi


# echo -e "\n-- `date` Wait for Elasticsearch and Kibana to be ready"
# . ./check.sh


# make some packet data
# ping -c 100 www.google.com >/dev/null
# sleep 20
if [ "${VM}" == "ubuntu16_deb_desktop_krb" ]; then
	su vagrant -c "nohup DISPLAY=:0 google-chrome --auth-server-whitelist=localhost --headless --ignore-certificate-errors ""https://localhost:5601"" &"
	
fi

if [ "${PLATFORM}" = "-windows-x86_64" ]; then

  set -x
  # echo "Cleaning up"
  # rm -f IEDriverServer.exe
  # rm -f node-v6.11.1-x64.msi
  # rm -f AdbeRdr11010_en_US.exe
  # rm -f IEDriverServer_Win32_3.4.0.zip
  # rm -f default-config.js
  # echo "Downloading NodeJS"
  # if [ ! -f node-v6.11.1-x64.msi ]; then wget -nv https://nodejs.org/dist/v6.11.1/node-v6.11.1-x64.msi; fi
  echo "Downloading AdobeReader"
  if [ ! -f IEDriverServer_Win32_3.4.0.zip ]; then wget -nv http://selenium-release.storage.googleapis.com/3.4/IEDriverServer_Win32_3.4.0.zip; fi
  echo "Downloading IEDriverServer_Win32"
  unzip -o IEDriverServer_Win32_3.4.0.zip
  # echo "Downloading The latest config for selenium-standalone"
  # if [ ! -f default-config.js ]; then wget -nv https://raw.githubusercontent.com/vvo/selenium-standalone/master/lib/default-config.js; fi
  echo "Downloading The latest selenium-standalone.jar"
  if [ ! -f selenium-server-standalone-3.4.0.jar ]; then wget -nv http://selenium-release.storage.googleapis.com/3.4/selenium-server-standalone-3.4.0.jar; fi
  # start configure_selenium.bat
fi


echo "This is the end of phase2.  Exit now"
# Write phase2.marker so the Windows provision.bat can check for it and
# know that we made it here.
# Other platforms probably don't need it.
echo "SUCCESS" > phase2.marker
exit
