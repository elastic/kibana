#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_xpack.sh

runTestsAndParseLines() {
  counter=1
  echo "Running each test suite $RUNS times"
  while [[ $counter -le $RUNS ]]; do
    echo "RUNNING: node scripts/functional_tests ${grepCommand}"
    eval node ./scripts/functional_tests ${grepCommand} |
      while read CMD; do
        echo $CMD
        parseLine "$CMD"
        if [ "$?" = 1 ]; then
          if [ "$testTime" != "" ]; then
            trackTestTime=" TEST_TIME:${testTime}ms"
          else
            trackTestTime=""
          fi

          if [ "$testName" != "" ]; then
            line="TEST_NAME:\"${testName}\"${trackTestTime} PASSED:${testPassed} THROTTLED:${throttled} ${APPEND}"
            echo "TRACKING: ${line}"
            echo $line >>"$resultsFile"
          fi
        fi
      done
    ((counter++))
  done
}

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

  echo " -> making hard link clones"
  cd ..
  cp -RlP kibana "kibana${CI_GROUP}"
  cd "kibana${CI_GROUP}/x-pack"

  echo " -> running tests from the clone folder"
  node scripts/functional_tests --debug --include-tag "ciGroup$CI_GROUP"  --config test/functional/config.coverage.js || true;

  if [[ -d ../target/kibana-coverage/functional ]]; then
    echo " -> replacing kibana${CI_GROUP} with kibana in json files"
    sed -i "s|kibana${CI_GROUP}|kibana|g" ../target/kibana-coverage/functional/*.json
    echo " -> copying coverage to the original folder"
    mkdir -p ../../kibana/target/kibana-coverage/functional
    mv ../target/kibana-coverage/functional/* ../../kibana/target/kibana-coverage/functional/
  fi
fi
