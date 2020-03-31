#!/usr/bin/env bash

cd "$KIBANA_DIR"
source src/dev/ci_setup/setup_env.sh

echo " -> Ensuring all functional tests are in a ciGroup"
cd "$XPACK_DIR"
node scripts/functional_tests --assert-none-excluded \
  --include-tag ciGroup1 \
  --include-tag ciGroup2 \
  --include-tag ciGroup3 \
  --include-tag ciGroup4 \
  --include-tag ciGroup5 \
  --include-tag ciGroup6 \
  --include-tag ciGroup7 \
  --include-tag ciGroup8 \
  --include-tag ciGroup9 \
  --include-tag ciGroup10

echo " -> building and extracting default Kibana distributable for use in functional tests"
cd "$KIBANA_DIR"
node scripts/build --debug --no-oss
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$PARENT_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
