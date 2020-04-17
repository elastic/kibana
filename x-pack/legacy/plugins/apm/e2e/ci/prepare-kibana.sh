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
nohup ./bin/kibana --no-base-path --config ${E2E_DIR}/ci/kibana.e2e.yml > ${E2E_DIR}/kibana.log 2>&1 &
