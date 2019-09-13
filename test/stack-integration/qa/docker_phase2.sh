#!/bin/bash
set -x
set -e
# https://github.com/NaturalHistoryMuseum/scratchpads2/wiki/Install-Docker-and-Docker-Compose-(Centos-7)

#cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=/vagrant/qa
cd $QADIR
if [ -f phase2.marker ]; then rm phase2.marker; fi
. ./envvars.sh


pushd /vagrant/stack-docker

# for PRODUCT in $PRODUCTS; do (
# # echo docker-compose -f docker-compose.yml -f docker-compose.setup.yml up setup_${PRODUCT} >> scripts/setup.sh
# echo docker-compose -f docker-compose.setup.yml up setup_${PRODUCT} >> scripts/setup.sh
# ); done


# TAG=6.6.0 ELASTIC_PASSWORD=changeit docker-compose -f setup.yml up
#TAG=${VERSION} ELASTIC_PASSWORD=changeit docker-compose -f setup.yml up --remove-orphans
TAG=${VERSION}${SNAPSHOT} ELASTIC_PASSWORD=changeit docker-compose -f setup/setup.yml run --rm setup

# for PRODUCT in $PRODUCTS; do (
#   TAG=${VERSION} docker-compose up -d  ${PRODUCT}
# ); done


docker ps
# for PRODUCT in $PRODUCTS; do (
#   docker ps | grep ${PRODUCT}
# ); done

TAG=${VERSION}${SNAPSHOT} docker-compose up -d
docker ps
docker logs logstash
sleep 20
docker ps
docker logs logstash
sleep 20
docker ps
docker logs logstash
sleep 20
docker ps
docker logs logstash
sleep 20
docker ps
docker logs logstash
sleep 20

popd

if [ "${SECURITY}" = "YES" ]; then
  echo -e "\n-- `date` Create all users and roles"
  cat users_roles.txt | while read line; do ./create_roles_users.sh $ESURL $line; done
fi

if [[ $PRODUCTS =~ .*apm-server.* ]]; then
  set +e
  if [ ! -f events.ndjson ]; then
    wget https://raw.githubusercontent.com/elastic/apm-server/7.0/testdata/intake-v2/events.ndjson
  fi
  sleep 40
  set +e
  curl -i -H "Content-type: application/x-ndjson" --data-binary @events.ndjson http://localhost:8200/intake/v2/events
fi


echo "SUCCESS" > phase2.marker
exit
