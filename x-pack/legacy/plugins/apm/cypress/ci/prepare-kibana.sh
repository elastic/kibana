#!/usr/bin/env bash
set -e

CYPRESS_DIR="x-pack/legacy/plugins/apm/cypress"

echo "1/3 Install dependencies ..."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
yarn kbn clean && yarn kbn bootstrap

echo "2/3 Ingest test data ..."
pushd ${CYPRESS_DIR}
yarn install
curl --silent https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output ingest-data/events.json
node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json > ingest-data.log

echo "3/3 Start Kibana ..."
popd
## Might help to avoid FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
nohup yarn start --config=${CYPRESS_DIR}/ci/kibana.dev.yml --no-base-path --csp.strict=false --optimize.watch=false> kibana.log 2>&1 &
echo $! > ${CYPRESS_DIR}/kibana_pid.txt
