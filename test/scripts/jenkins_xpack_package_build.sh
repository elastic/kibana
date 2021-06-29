#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh

export TMP=/tmp
export TMPDIR=/tmp

node scripts/build --all-platforms --debug

gsutil -q -m cp 'target/*' "gs://ci-artifacts.kibana.dev/package-testing/$GIT_COMMIT/"
