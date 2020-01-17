#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

if [[ -z "$CODE_COVERAGE" ]]; then
  echo " -> Running functional and api tests"

  checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
    node scripts/functional_tests \
      --debug --bail \
      --kibana-install-dir "$KIBANA_INSTALL_DIR" \
      --include-tag "ciGroup$CI_GROUP"

  echo ""
  echo ""
else
  echo " -> Running X-Pack functional tests with code coverage"
  export NODE_OPTIONS=--max_old_space_size=8192
  node scripts/functional_tests --debug --include-tag "ciGroup$CI_GROUP"
fi
