#!/usr/bin/env bash

set -e
trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT

node scripts/build --debug --oss;
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-oss-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

export TEST_BROWSER_HEADLESS=1

checks-reporter-with-killswitch "Kibana accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --config test/accessibility/config.ts;
