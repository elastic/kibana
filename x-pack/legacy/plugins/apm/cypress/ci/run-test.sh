#!/usr/bin/env bash
set -e

CYPRESS_DIR="x-pack/legacy/plugins/apm/cypress"
function finish {
  kill -9 `cat ${CYPRESS_DIR}/kibana_pid.txt`
  rm "${CYPRESS_DIR}/kibana_pid.txt"
}
trap finish EXIT

echo "1/2 Build docker image ..."
docker build --tag cypress ${CYPRESS_DIR}/ci

echo "2/2 Run cypress tests ..."
docker run --rm -t --user "$(id -u):$(id -g)" \
           -v `pwd`:/app --network="host" \
           --name cypress cypress


