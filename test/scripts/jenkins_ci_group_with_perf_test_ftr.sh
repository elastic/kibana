echo "### About to run test/scripts/jenkins_test_setup_oss.sh"

source test/scripts/jenkins_test_setup_oss.sh

echo "### Finished running test/scripts/jenkins_test_setup_oss.sh"

if [[ -z "$CODE_COVERAGE" ]]; then
  checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}"

  if [ "$CI_GROUP" == "1" ]; then
    source test/scripts/jenkins_build_kbn_sample_panel_action.sh
    yarn run grunt run:pluginFunctionalTestsRelease --from=source
    yarn run grunt run:exampleFunctionalTestsRelease --from=source
    yarn run grunt run:interpreterFunctionalTestsRelease
  fi
else
  echo " -> Running Functional tests with code coverage"
  export NODE_OPTIONS=--max_old_space_size=8192

  echo " -> making hard link clones"
  cd ..
  cp -RlP kibana "kibana${CI_GROUP}"
  cd "kibana${CI_GROUP}"

  echo "### Running FTR PERF TESTS"
  #yarn run grunt "run:functionalTests_ciGroup${CI_GROUP}";

  echo "### Running FTR PERF TESTS Start"
  echo "### Eval-ing: ..."
  echo "### node scripts/functional_tests --debug --include-tag ciGroup$CI_GROUP --config test/functional/config.coverage.js"
  echo ""
  REMOVE="o.e.n.Node"
  CONFIG_FLAG="--config test/functional/config.coverage.js"
#  eval node scripts/functional_tests --include-tag "ciGroup${CI_GROUP}" ${CONFIG_FLAG} | grep -v "${REMOVE}" |
  eval node scripts/functional_tests --include-tag "ciGroup${CI_GROUP}" ${CONFIG_FLAG} |
    while read LINE; do
      node scripts/perf_test_ftr_benchmark.js --verbose --line "${LINE}"
    done

  echo "### Running FTR PERF TESTS Complete"

  if [[ -d target/kibana-coverage/functional ]]; then
    echo " -> replacing kibana${CI_GROUP} with kibana in json files"
    sed -i "s|kibana${CI_GROUP}|kibana|g" target/kibana-coverage/functional/*.json
    echo " -> copying coverage to the original folder"
    mkdir -p ../kibana/target/kibana-coverage/functional
    mv target/kibana-coverage/functional/* ../kibana/target/kibana-coverage/functional/
  fi
fi
