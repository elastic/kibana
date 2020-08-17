#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh
source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

echo " -> building and extracting default Kibana distributable"
cd "$KIBANA_DIR"
node scripts/build --debug --no-oss
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

mkdir -p "$WORKSPACE/kibana-build-xpack"
cp -pR install/kibana/. $WORKSPACE/kibana-build-xpack/

# cd "$KIBANA_DIR"
# source "test/scripts/jenkins_xpack_page_load_metrics.sh"

cd "$KIBANA_DIR"
source "test/scripts/jenkins_xpack_saved_objects_field_metrics.sh"

echo " -> running visual regression tests from x-pack directory"
cd "$XPACK_DIR"
yarn percy exec -t 10000 -- -- \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --config test/visual_regression/config.ts;
