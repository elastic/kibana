#!/usr/bin/env bash

echo " -> building and extracting default Kibana distributable for use in functional tests"
cd "$KIBANA_DIR"
source src/dev/ci_setup/setup_env.sh
node scripts/build --debug --no-oss
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1