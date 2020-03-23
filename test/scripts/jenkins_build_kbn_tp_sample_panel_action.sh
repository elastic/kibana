#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd test/plugin_functional/plugins/kbn_tp_sample_panel_action;
if [[ ! -d "target" ]]; then
  checks-reporter-with-killswitch "Build kbn_tp_sample_panel_action" yarn build;
fi
cd -;
