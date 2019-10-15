#!/usr/bin/env bash
set -e

CYPRESS_DIR="x-pack/legacy/plugins/apm/cypress"

## Install dependencies
test/scripts/jenkins_setup.sh
yarn kbn bootstrap
cp ${CYPRESS_DIR}/kibana.dev.yml config/kibana.dev.yml
cp ${CYPRESS_DIR}/kibana.dev.yml config/kibana.yml
npm install -g wait-on

## Ingest test data
pushd ${CYPRESS_DIR}
yarn install
curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output events.json
node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json

## Start Kibana
popd
nohup node scripts/kibana > kibana.log 2>&1 &

## Wait for kibana and run cypress
pushd ${CYPRESS_DIR}
wait-on http://localhost:5601 && yarn cypress run
