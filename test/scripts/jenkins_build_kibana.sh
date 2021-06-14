#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
  ./test/scripts/jenkins_build_plugins.sh
fi

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

echo " -> Ensuring all functional tests are in a ciGroup"
node scripts/ensure_all_tests_in_ci_group;

echo " -> building and extracting OSS Kibana distributable for use in functional tests"
node scripts/build --debug --oss

echo " -> shipping metrics from build to ci-stats"
node scripts/ship_ci_stats \
  --metrics target/optimizer_bundle_metrics.json \
  --metrics packages/kbn-ui-shared-deps/target/metrics.json

mkdir -p "$WORKSPACE/kibana-build-oss"
cp -pR build/oss/kibana-*-SNAPSHOT-linux-x86_64/. $WORKSPACE/kibana-build-oss/
