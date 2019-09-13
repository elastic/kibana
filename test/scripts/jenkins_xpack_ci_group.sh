#!/usr/bin/env bash

set -e

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  trap 'node "$KIBANA_DIR/src/dev/failed_tests/cli"' EXIT
else
  source src/dev/ci_setup/setup_env.sh
fi

export TEST_BROWSER_HEADLESS=1

if [[ -z "$IS_PIPELINE_JOB" ]] ; then
  echo " -> Ensuring all functional tests are in a ciGroup"
  cd "$XPACK_DIR"
  node scripts/functional_tests --assert-none-excluded \
    --include-tag ciGroup1 \
    --include-tag ciGroup2 \
    --include-tag ciGroup3 \
    --include-tag ciGroup4 \
    --include-tag ciGroup5
fi

cd "$KIBANA_DIR"

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

echo " -> Running functional and api tests"
cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "ciGroup$CI_GROUP"

echo ""
echo ""

# checks-reporter-with-killswitch "X-Pack Firefox Functional tests / Group ${CI_GROUP}" \
#   node scripts/functional_tests --debug --bail \
#   --kibana-install-dir "$installDir" \
#   --include-tag "ciGroup$CI_GROUP" \
#   --config "test/functional/config.firefox.js"
# echo ""
# echo ""
