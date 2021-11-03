#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh
source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

echo " -> building and extracting default Kibana distributable"
cd "$KIBANA_DIR"
node scripts/build --debug

echo " -> shipping metrics from build to ci-stats"
node scripts/ship_ci_stats \
  --metrics target/optimizer_bundle_metrics.json \
  --metrics build/kibana/node_modules/@kbn/ui-shared-deps-src/shared_built_assets/metrics.json

linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

mkdir -p "$WORKSPACE/kibana-build"
cp -pR install/kibana/. $WORKSPACE/kibana-build/

cd "$KIBANA_DIR"
source "test/scripts/jenkins_xpack_saved_objects_field_metrics.sh"
