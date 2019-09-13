#!/bin/bash
if ! [[ `uname -s` =~ .*NT.* ]]; then
  if [ "$(id -u)" != "0" ]; then
   echo -e "\n\nre-starting this script as root\n\n"
   sudo $0
   exit 1
 fi
fi

echo "cd to /vagrant/qa because that's where the license files are"
cd /vagrant/qa || exit 1
ls license_rel_gold.json || exit 1

# get variables from here
. ./envvars.sh


ESUSR=elastic
ESPWD=changeit
#ESPORT=9200
#ESPROTO=https
#ESHOST=localhost
#ESURL=${ESPROTO}://${ESUSR}:${ESPWD}@${ESHOST}:${ESPORT}

# make sure we're running the ubuntu_deb VM otherwise our service stop/starts won't work
if [[ ${VM} != 'ubuntu_deb' ]]; then
  echo "This script only works on ubuntu_deb VM"
  exit 1
fi

# add a check here for ${SNAPSHOT} ?  This script is only set to use release licenses.
# Or change it to use dev licenses for snapshots.

# https://www.elastic.co/subscriptions

function showLicense {
  curl -s  ${ESURL}/_license  | grep -E '(status|type)' -B10 -A10
}

function setLicense {
  # when we start we might already be on the trial license for check first
  curl -s  ${ESURL}/_license  | grep $1 || (
    echo "Installing $1 license now\n"
    echo "curl -XPUT -u ${ESUSR}:${ESPWD} "${ESURL}/_xpack/license?acknowledge=true"  -H "Content-Type: application/json" -d @license_rel_${1}.json"
    curl -XPUT -u ${ESUSR}:${ESPWD} "${ESURL}/_xpack/license?acknowledge=true"  -H "Content-Type: application/json" -d @license_rel_${1}.json
    showLicense
  )
}

function expireLicense {
  # get the license expire time from Elasticsearch
  EXPIRE=`curl -s  ${ESURL}/_license | grep "\"expiry_date\"" | cut -d\" -f4`
  echo "expiry_date : $EXPIRE"

  # if you're on a VM with the VirtualBox Additions, you have to stop the service before you can change the system time with date command
  service vboxadd-service status | grep running && service vboxadd-service stop

  # stop elasticsearch (I don't think its fair to change it this much while it's running)
  service elasticsearch stop

  # set the date to 5 minutes before the license will expire
  date -s "$EXPIRE-5 minutes"
  date
  service elasticsearch start
  echo "Wait 5 minutes for license to expire.  Feel free to play with Kibana while waiting"
  sleep 1m
  echo "4 minutes remaining"
  sleep 1m
  echo "3 minutes remaining"
  sleep 1m
  echo "2 minutes remaining"
  sleep 1m
  echo "1 minute remaining"
  sleep 1m
  showLicense
  echo "Check for the following Kibana behavior;"
}

function resetTime {
  date
  echo -e "\n\nSetting the date/time back to now\n\n"
  service vboxadd-service start
  date
}


################# START #######################

for license in trial basic gold platinum; do (
  echo "Testing license $license"
  setLicense $license

  grep "$license.*active" license_states.txt
  read -r -n 1 -s -p "Press any key to continue"

  expireLicense
  grep "$license.*expired" license_states.txt
  read -r -n 1 -s -p "Press any key to continue"

  resetTime
);
done


# if security is NOT enabled, I think, we can check/wait until these become true (and check before hand that they are not true
#curl http://localhost:5601/app/kibana#/reporting | grep "Graph is unavailable - license has expired"
#curl http://localhost:5601/app/kibana#/reporting | grep "You cannot use Reporting because your trial license has expired"
#curl http://localhost:5601/app/kibana#/reporting | grep "Profiler is unavailable - license has expired"

# if we have Basic or Gold license, can we also check that the appropriate messages are there?
# this isn't really checking the UI but easy to automate


#tail -f /var/log/elasticsearch/elasticsearch.log
