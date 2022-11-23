#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

node scripts/functional_tests \
  --bail --debug \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --include-tag "includeFirefox" \
  --config test/functional/config.firefox.js;
