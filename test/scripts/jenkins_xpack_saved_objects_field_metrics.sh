#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --config test/saved_objects_field_count/config.ts;
