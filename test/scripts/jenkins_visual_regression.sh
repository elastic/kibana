#!/usr/bin/env bash

set -e
trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT

source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

node scripts/build --debug --oss;
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-oss-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

export TEST_BROWSER_HEADLESS=1

checks-reporter-with-killswitch "Kibana visual regression tests" \
  yarn run percy exec \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --config test/visual_regression/config.ts;
