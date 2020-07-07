#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

echo " -> building examples separate from test plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --examples \
  --workers 6 \
  --verbose

echo " -> building kibana platform plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --no-examples \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --workers 6 \
  --verbose
