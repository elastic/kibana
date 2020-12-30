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

# For parallel workspaces, we should copy the .es directory from the root, because it should already have downloaded snapshots in it
# This isn't part of jenkins_setup_parallel_workspace.sh just because not all tasks require ES
if [[ ! -d .es && -d "$WORKSPACE/kibana/.es" ]]; then
  cp -R $WORKSPACE/kibana/.es ./
fi
