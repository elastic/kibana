#!/usr/bin/env bash

cd "$KIBANA_DIR"
source src/dev/ci_setup/setup_env.sh

if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
    ./test/scripts/jenkins_build_plugins.sh
fi

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

echo " -> Ensuring all functional tests are in a ciGroup"
node scripts/ensure_all_tests_in_ci_group;

echo " -> Ensuring all x-pack functional tests are in a ciGroup"
node x-pack/scripts/functional_tests --assert-none-excluded \
--include-tag ciGroup1 \
--include-tag ciGroup2 \
--include-tag ciGroup3 \
--include-tag ciGroup4 \
--include-tag ciGroup5 \
--include-tag ciGroup6 \
--include-tag ciGroup7 \
--include-tag ciGroup8 \
--include-tag ciGroup9 \
--include-tag ciGroup10 \
--include-tag ciGroup11 \
--include-tag ciGroup12 \
--include-tag ciGroup13 \
--include-tag ciGroupDocker
