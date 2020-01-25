#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

echo " -> building new platform plugins"
node scripts/build_new_platform_plugins \
  --oss \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --verbose;

echo " -> downloading es snapshot"
node scripts/es snapshot --license=oss --download-only;

echo " -> Ensuring all functional tests are in a ciGroup"
yarn run grunt functionalTests:ensureAllTestsInCiGroup;

# Do not build kibana for code coverage run
if [[ -z "$CODE_COVERAGE" ]] ; then
  echo " -> building and extracting OSS Kibana distributable for use in functional tests"
  node scripts/build --debug --oss
fi
