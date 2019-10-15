#!/usr/bin/env bash
set -ex

CYPRESS_DIR="x-pack/legacy/plugins/apm/cypress"

echo "1/4 Install dependencies..."
source src/dev/ci_setup/setup_env.sh true
yarn kbn bootstrap
cp ${CYPRESS_DIR}/kibana.dev.yml config/kibana.dev.yml
cp ${CYPRESS_DIR}/kibana.dev.yml config/kibana.yml
npm install -g wait-on

echo "2/4 Ingest test data..."
pushd ${CYPRESS_DIR}
yarn install
curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output events.json
node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json

echo "3/4 Start Kibana..."
popd
nohup node scripts/kibana > kibana.log 2>&1 &

echo "4/4 Run cypress tests..."
pushd ${CYPRESS_DIR}
wait-on http://localhost:5601 && yarn cypress run
