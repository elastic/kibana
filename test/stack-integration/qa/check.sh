#!/bin/bash
set -e

if ! [[ `uname -s` =~ .*NT.* ]]; then
  if [ "$(id -u)" != "0" ]; then
   echo -e "\n\nERROR: This script must be run as root\n\n"
   exit 1
 fi
fi

if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi

set +e
echo -e "\n `date`-----------------Package Information----------------------------------"
case $OS in
  ubuntu)
    dpkg --list $PRODUCTS
    echo -e "\n `date`-----------------Service Status---------------------------------------"
    for i in $PRODUCTS; do service $i status; done
    ;;
  centos)
    yum list $PRODUCTS
    echo -e "\n `date`-----------------Service Status---------------------------------------"
    for i in $PRODUCTS; do service $i status; done
    ;;
  suse)
    zypper info $PRODUCTS
    echo -e "\n `date`-----------------Service Status---------------------------------------"
    for i in $PRODUCTS; do service $i status; done
    ;;
  tar.gz|zip)
    ls -l $INSTALL_DIR
    ;;
esac


# try 20 times, 4 seconds apart
echo -e "\n `date`------------wait for Elasticserach to be up at ${ESURL} ----------"
for i in `seq 1 20`; do
  echo "curl es index"
  curl -k -s ${ESURL} && break
  sleep 4
done
curl -k ${ESURL}

if [ "${ESHOST}" = "localhost" ]; then

  echo -e "\n `date`----------- Wait for elasticsearch plugin status to be green ----------------"
  for i in `seq 1 30`; do
    echo "${i} `date` check kibana status api for state 'green'"
    curl -k ${KIBANAURL}/api/status > /tmp/tempcurl 2>&1
    curl -k https://elastic:changeit@10.0.2.15:5601/api/status >> /tmp/tempcurl 2>&1
    curl -k http://elastic:changeit@10.0.2.15:5601/api/status >> /tmp/tempcurl 2>&1
    curl -k https://elastic:changeit@localhost:5601/api/status >> /tmp/tempcurl 2>&1
    grep "\"state\":\"green\"" /tmp/tempcurl && break
    sleep 4
  done
  grep "\"state\":\"green\"" /tmp/tempcurl

  # echo -e "\n `date`-----------------Shield File Users-----------------------------------------"
  # if [[ `uname -s` =~ .*NT.* ]]; then
  #   ${INSTALL_DIR}/elasticsearch/bin/x-pack/users.bat list
  # else
  #   ${INSTALL_DIR}/elasticsearch/bin/x-pack/users list
  # fi

fi

#journalctl --since "2016-03-30"
#journalctl -u kibana.service


echo -e "\n `date`-----------------Shield Native Users-----------------------------------------"
curl -k -s -XGET ${ESURL}/_xpack/security/user?pretty | grep username
echo -e "\n `date`-----------------Shield Native Roles-----------------------------------------"
curl -k -s -XGET ${ESURL}/_xpack/security/role?pretty | grep ".*\".*{" | grep -v metadata | sed 's/: {//'

echo -e "\n `date`-- ${ESURL}/_cat/indices?v"
curl -k -s ${ESURL}/_cat/indices?v
