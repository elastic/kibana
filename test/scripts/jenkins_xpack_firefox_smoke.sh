#!/usr/bin/env bash

set -e
trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT

node scripts/build --debug --no-oss;
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

export TEST_BROWSER_HEADLESS=1

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack firefox smoke test" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --include-tag "smoke" \
    --config test/functional/config.firefox.js;
