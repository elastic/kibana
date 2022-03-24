#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

checks-reporter-with-killswitch "Server Integration Tests" \
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
checks-reporter-with-killswitch "Status Integration Tests" \
  node scripts/functional_tests \
    --config test/server_integration/http/platform/config.status.ts \
    --bail \
    --debug \

# Tests that must be run against source in order to build test plugins
checks-reporter-with-killswitch "Analytics Integration Tests" \
  node scripts/functional_tests \
    --config test/server_integration/analytics/config.ts \
    --bail \
    --debug \
