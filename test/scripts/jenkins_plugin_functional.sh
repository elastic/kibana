#!/usr/bin/env bash

source test/scripts/jenkins_test_setup_oss.sh

cd test/plugin_functional/plugins/kbn_sample_panel_action;
if [[ ! -d "target" ]]; then
  yarn build;
fi
cd -;

pwd

./test/scripts/test/plugin_functional.sh
./test/scripts/test/example_functional.sh
./test/scripts/test/interpreter_functional.sh
