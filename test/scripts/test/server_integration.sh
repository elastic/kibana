#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

node scripts/functional_tests \
  --config test/server_integration/http/ssl/config.js \
  --config test/server_integration/http/ssl_redirect/config.js \
  --config test/server_integration/http/platform/config.ts \
  --config test/server_integration/http/ssl_with_p12/config.js \
  --config test/server_integration/http/ssl_with_p12_intermediate/config.js \
  --bail \
  --debug \
  --kibana-install-dir $KIBANA_INSTALL_DIR

# Tests that must be run against source in order to build test plugins
node scripts/functional_tests \
  --config test/server_integration/http/platform/config.status.ts \
  --bail \
  --debug
