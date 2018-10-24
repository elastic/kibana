#!/usr/bin/env bash

set -e
set -o pipefail

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname $0)/../../src/dev/ci_setup/java_setup.sh"


export XPACK_DIR="$(cd "$(dirname "$0")/../../x-pack"; pwd)"
echo "-> XPACK_DIR ${XPACK_DIR}"


echo " -> Skipping Running mocha tests"
cd "$XPACK_DIR"
# xvfb-run yarn test
echo ""
echo ""


echo " -> Running jest tests (only for ingest)"
cd "$XPACK_DIR"
node scripts/jest --ci --no-cache --verbose ingest
echo ""
echo ""


echo " -> building and extracting default Kibana distributable for use in functional tests"
cd "$KIBANA_DIR"
node scripts/build --debug --no-oss
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

export TEST_ES_FROM=${TEST_ES_FROM:-source}
echo " -> Running functional and api tests"
cd "$XPACK_DIR"
xvfb-run node scripts/functional_tests --debug --bail --kibana-install-dir "$installDir"
echo ""
echo ""
