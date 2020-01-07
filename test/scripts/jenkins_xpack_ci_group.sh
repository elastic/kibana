#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "ciGroup$CI_GROUP"

echo ""
echo ""

# checks-reporter-with-killswitch "X-Pack Firefox Functional tests / Group ${CI_GROUP}" \
#   node scripts/functional_tests --debug --bail \
#   --kibana-install-dir "$installDir" \
#   --include-tag "ciGroup$CI_GROUP" \
#   --config "test/functional/config.firefox.js"
# echo ""
# echo ""
