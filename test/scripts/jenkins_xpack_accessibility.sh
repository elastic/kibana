#!/usr/bin/env bash

set -e

if [[ -n "$IS_PIPELINE_JOB" ]] ; then
  source src/dev/ci_setup/setup_env.sh
fi

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  echo " -> building and extracting default Kibana distributable for use in functional tests"
  node scripts/build --debug --no-oss

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

checks-reporter-with-killswitch "X-Pack accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --config test/accessibility/config.ts;
