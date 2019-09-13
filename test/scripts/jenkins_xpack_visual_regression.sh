#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  node scripts/build --debug --no-oss;
  linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
  installDir="$PARENT_DIR/install/kibana"
  mkdir -p "$installDir"
  tar -xzf "$linuxBuild" -C "$installDir" --strip=1
  export KIBANA_INSTALL_DIR="$installDir"
else
  installDir="$PARENT_DIR/install/kibana"
  destDir="${installDir}-${CI_WORKER_NUMBER}"
  cp -R "$installDir" "$destDir"

  export KIBANA_INSTALL_DIR="$destDir"
fi

export TEST_BROWSER_HEADLESS=1

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack visual regression tests" \
  yarn run percy exec \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/visual_regression/config.js;
