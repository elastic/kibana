#!/bin/bash
set -x
set -e

QADIR=/vagrant/qa
cd $QADIR
if [ -f phase1.marker ]; then rm phase1.marker; fi

. ./envvars.sh

apt update
apt-get update
export DEBIAN_FRONTEND=noninteractive
apt -yq upgrade --fix-missing
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt update
apt install -y docker-ce
systemctl status docker
docker -v

curl -L "https://github.com/docker/compose/releases/download/1.23.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>&1 > docker_temp.txt
cat docker_temp.txt
chmod +x /usr/local/bin/docker-compose
docker-compose --version


sysctl -w vm.max_map_count=262144

# curl the build artifacts for snapshots or staging, but for artifacts we'll get official docker images by tag
if [[ "$MANIFEST" != "artifacts" ]]; then
  pushd /vagrant/stack-docker
  DOWNLOADS="elasticsearch kibana logstash apm-server metricbeat packetbeat filebeat heartbeat auditbeat"


  for PRODUCT in $DOWNLOADS; do (
    url=`grep "\"url\":.*${PRODUCT}-${VERSION}${SNAPSHOT}.*-docker-image.*\.tar\.gz" ../manifest-${VERSION}${SNAPSHOT}.json | sed 's|.*\(http.*tar.gz\).*|\1|'`
    echo $url
  ); done


  for PRODUCT in $DOWNLOADS; do (
    url=`grep "\"url\":.*${PRODUCT}-${VERSION}${SNAPSHOT}.*-docker-image.*\.tar\.gz" ../manifest-${VERSION}${SNAPSHOT}.json | sed 's|.*\(http.*tar.gz\).*|\1|'`
    echo $url
    curl $url | docker load
  ); done

  docker image ls
  popd
fi


echo "SUCCESS" > phase1.marker
