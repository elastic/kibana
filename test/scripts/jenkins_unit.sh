#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

rename_coverage_file() {
  test -f target/kibana-coverage/jest/coverage-final.json \
    && mv target/kibana-coverage/jest/coverage-final.json \
    target/kibana-coverage/jest/$1-coverage-final.json
}

if [[ -z "$CODE_COVERAGE" ]] ; then
  # Lint
  ./test/scripts/lint/eslint.sh
  ./test/scripts/lint/sasslint.sh

  # Test
  ./test/scripts/test/jest_integration.sh
  ./test/scripts/test/mocha.sh
  ./test/scripts/test/jest_unit.sh
  ./test/scripts/test/api_integration.sh

  # Check
  ./test/scripts/checks/telemetry.sh
  ./test/scripts/checks/ts_projects.sh
  ./test/scripts/checks/jest_configs.sh
  ./test/scripts/checks/doc_api_changes.sh
  ./test/scripts/checks/type_check.sh
  ./test/scripts/checks/bundle_limits.sh
  ./test/scripts/checks/i18n.sh
  ./test/scripts/checks/file_casing.sh
  ./test/scripts/checks/licenses.sh
  ./test/scripts/checks/plugins_with_circular_deps.sh
  ./test/scripts/checks/verify_notice.sh
  ./test/scripts/checks/test_projects.sh
  ./test/scripts/checks/test_hardening.sh
else
  # echo " -> Running jest tests with coverage"
  # node scripts/jest --ci --verbose --coverage
  # rename_coverage_file "oss"
  # echo ""
  # echo ""
  # echo " -> Running jest integration tests with coverage"
  # node --max-old-space-size=8192 scripts/jest_integration --ci --verbose --coverage || true;
  # rename_coverage_file "oss-integration"
  # echo ""
  # echo ""
  echo " -> Running mocha tests with coverage"
  ./test/scripts/checks/mocha_coverage.sh
  echo ""
  echo ""
fi
