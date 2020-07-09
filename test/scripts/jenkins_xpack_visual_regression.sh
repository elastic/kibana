#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh
source "$KIBANA_DIR/src/dev/ci_setup/setup_percy.sh"

echo " -> building and extracting default Kibana distributable"
cd "$KIBANA_DIR"
node scripts/build --debug
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

echo " -> running visual regression tests from x-pack directory"
cd "$XPACK_DIR"
yarn percy exec -t 10000 -- -- \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$installDir" \
    --config test/visual_regression/config.ts;

# cd "$KIBANA_DIR"
# source "test/scripts/jenkins_xpack_page_load_metrics.sh"

cd "$XPACK_DIR"
source "$KIBANA_DIR/test/scripts/jenkins_xpack_saved_objects_field_metrics.sh"
