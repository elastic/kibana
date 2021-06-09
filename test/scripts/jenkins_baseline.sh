#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh
source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

echo " -> building and extracting OSS Kibana distributable for use in functional tests"
node scripts/build --debug --oss

echo " -> shipping metrics from build to ci-stats"
node scripts/ship_ci_stats \
  --metrics target/optimizer_bundle_metrics.json \
  --metrics packages/kbn-ui-shared-deps/shared_built_assets/metrics.json

linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
