#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

echo " -> building examples separate from test plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --examples \
  --verbose;

echo " -> building test plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --no-examples \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --verbose;

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

echo " -> Ensuring all functional tests are in a ciGroup"
yarn run grunt functionalTests:ensureAllTestsInCiGroup;

echo " -> building and extracting OSS Kibana distributable for use in functional tests"
node scripts/build --debug --oss
