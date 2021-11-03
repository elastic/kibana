#!/usr/bin/env bash

cd "$KIBANA_DIR"
source src/dev/ci_setup/setup_env.sh

if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
  ./test/scripts/jenkins_build_plugins.sh
fi

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

echo " -> Ensuring all functional tests are in a ciGroup"
node scripts/ensure_all_tests_in_ci_group

# Do not build kibana for code coverage run
if [[ -z "$CODE_COVERAGE" ]] ; then
  echo " -> building and extracting default Kibana distributable for use in functional tests"
  node scripts/build --debug

  echo " -> shipping metrics from build to ci-stats"
  node scripts/ship_ci_stats \
    --metrics target/optimizer_bundle_metrics.json \
    --metrics build/kibana/node_modules/@kbn/ui-shared-deps-src/shared_built_assets/metrics.json

  linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
  installDir="$KIBANA_DIR/install/kibana"
  mkdir -p "$installDir"
  tar -xzf "$linuxBuild" -C "$installDir" --strip=1
  cp "$linuxBuild" "$WORKSPACE/kibana-default.tar.gz"

  mkdir -p "$WORKSPACE/kibana-build"
  cp -pR install/kibana/. $WORKSPACE/kibana-build/

  echo " -> Archive built plugins"
  shopt -s globstar
  tar -zcf \
    "$WORKSPACE/kibana-default-plugins.tar.gz" \
    x-pack/plugins/**/target/public \
    x-pack/test/**/target/public \
    examples/**/target/public \
    x-pack/examples/**/target/public \
    test/**/target/public
  shopt -u globstar
fi
