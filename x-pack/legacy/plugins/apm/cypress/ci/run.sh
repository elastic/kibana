#!/usr/bin/env bash
set -ex

CYPRESS_DIR="x-pack/legacy/plugins/apm/cypress"

echo "1/4 Install dependencies..."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
yarn kbn bootstrap
cp ${CYPRESS_DIR}/ci/kibana.dev.yml config/kibana.dev.yml
echo 'elasticsearch:' >> config/kibana.dev.yml
cp ${CYPRESS_DIR}/ci/kibana.dev.yml config/kibana.yml
npm install -g wait-on

echo "2/4 Ingest test data..."
pushd ${CYPRESS_DIR}
yarn install
curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output ingest-data/events.json
node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json

echo "3/4 Start Kibana..."
popd
## Might help to avoid FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
nohup NODE_OPTIONS=--max-old-space-size=4096 node scripts/kibana > kibana.log 2>&1 &

echo "4/4 Run cypress tests..."
pushd ${CYPRESS_DIR}
wait-on http://localhost:5601 && yarn cypress run
