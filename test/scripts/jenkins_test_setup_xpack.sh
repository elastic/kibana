#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]]; then

  destDir="build/kibana-build-xpack"
  if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
    destDir="${destDir}-${CI_PARALLEL_PROCESS_NUMBER}"
  fi

  if [[ ! -d $destDir ]]; then
    mkdir -p $destDir
    cp -R "$WORKSPACE/kibana-build-xpack/." $destDir/

    if [[ "$TASK_QUEUE_PROCESS_ID" ]]; then
      echo " -> building kibana platform plugins"
      node scripts/build_kibana_platform_plugins \
        --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
        --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/fixtures/plugins" \
        --workers 4 \
        --verbose;
    fi
  fi

  export KIBANA_INSTALL_DIR="$(realpath $destDir)"

  cd "$XPACK_DIR"
fi
