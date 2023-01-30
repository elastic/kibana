#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

echo " -> building kibana platform plugins"
node scripts/build_kibana_platform_plugins \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/health_gateway/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/plugins" \
  --scan-dir "$KIBANA_DIR/examples" \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
  --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/plugins" \
  --scan-dir "$XPACK_DIR/test/alerting_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_perf/plugins" \
  --scan-dir "$XPACK_DIR/test/licensing_plugin/plugins" \
  --scan-dir "$XPACK_DIR/test/usage_collection/plugins" \
  --scan-dir "$XPACK_DIR/test/security_functional/fixtures/common" \
  --scan-dir "$XPACK_DIR/examples" \
  --workers 12
