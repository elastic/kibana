#!/usr/bin/env bash

set -e

function post_work() {
  set +e
  if [[ -z "$REMOVE_KIBANA_INSTALL_DIR" && -z "$KIBANA_INSTALL_DIR" && -d "$KIBANA_INSTALL_DIR" ]]; then
    rm -rf "$REMOVE_KIBANA_INSTALL_DIR"
  fi
}

trap 'post_work' EXIT

export TEST_BROWSER_HEADLESS=1

source src/dev/ci_setup/setup_env.sh
