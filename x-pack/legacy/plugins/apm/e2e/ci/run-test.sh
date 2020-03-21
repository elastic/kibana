#!/usr/bin/env bash
set -e

E2E_DIR="x-pack/legacy/plugins/apm/e2e"
function finish {
  kill -9 "$(cat ${E2E_DIR}/kibana_pid.txt)"
  rm "${E2E_DIR}/kibana_pid.txt"
}
trap finish EXIT

echo "1/2 Build docker image ..."
docker build --tag cypress --build-arg NODE_VERSION="$(cat .node-version)" ${E2E_DIR}/ci

echo "2/2 Run cypress tests ..."
docker run --rm -t --user "$(id -u):$(id -g)" \
           -v "$(pwd)":/app --network="host" \
           --name cypress cypress
