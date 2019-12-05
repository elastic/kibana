set -e

function post_work() {
  set +e
  if [[ -z "$IS_PIPELINE_JOB" ]] ; then
    node "$KIBANA_DIR/scripts/report_failed_tests"
  fi

  if [[ -z "$REMOVE_KIBANA_INSTALL_DIR" && -z "$KIBANA_INSTALL_DIR" && -d "$KIBANA_INSTALL_DIR" ]]; then
    rm -rf "$REMOVE_KIBANA_INSTALL_DIR"
  fi
}

trap 'post_work' EXIT

export TEST_BROWSER_HEADLESS=1

if [[ -n "$IS_PIPELINE_JOB" ]] ; then
  source src/dev/ci_setup/setup_env.sh
fi
