#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

node scripts/build --debug --oss;
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-oss-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

export TEST_BROWSER_HEADLESS=1

checks-reporter-with-killswitch "Firefox smoke test" \
  node scripts/functional_tests \
    --bail --debug \
    --kibana-install-dir "$installDir" \
    --include-tag "smoke" \
    --config test/functional/config.firefox.js;

source "$KIBANA_DIR/test/scripts/jenkins_xpack_firefox_smoke.sh"
