#!/usr/bin/env bash
##
## This is a wrapper to configure the environment with the right tools in the CI
## and run the cypress steps.
##
## NOTE: it's required to run run-e2e.sh previously. This is the wrapper to help with
##       the rerun of the e2e.
##

E2E_DIR="${0%/*}/.."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
set -ex
cd "${E2E_DIR}"
rm cypress/test-results/*.* || true
rm -rf cypress/screenshots/* || true
yarn cypress run --config pageLoadTimeout=100000,watchForFileChanges=true
