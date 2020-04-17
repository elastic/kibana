#!/usr/bin/env bash
set -ex

E2E_DIR=x-pack/legacy/plugins/apm/e2e
echo "1/3 Install dependencies ..."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
yarn kbn clean && yarn kbn bootstrap

echo "2/3 Build kibana ..."
yarn build --no-oss --skip-os-packages

echo "3/3 Start Kibana (production mode) ..."
## Might help to avoid FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
nohup node ./scripts/kibana --no-base-path --no-watch --config ${E2E_DIR}/ci/kibana.e2e.yml > ${E2E_DIR}/kibana.log 2>&1 &
