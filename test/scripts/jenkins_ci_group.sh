#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --include-tag "ciGroup$CI_GROUP"

if [[ ! "$TASK_QUEUE_PROCESS_ID" && "$CI_GROUP" == "1" ]]; then
  source test/scripts/jenkins_build_kbn_sample_panel_action.sh
  ./test/scripts/test/plugin_functional.sh
  ./test/scripts/test/interpreter_functional.sh
fi
