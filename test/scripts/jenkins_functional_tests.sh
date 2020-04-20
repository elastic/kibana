#!/usr/bin/env bash
set -e

TYPE=$1
CONFIG=$2
shift
shift
PARAMS="$@"

echo $TYPE
echo $CONFIG
echo $PARAMS

source test/scripts/jenkins_test_setup_$TYPE.sh
node scripts/functional_tests \
  --config "$CONFIG" \
  --debug \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  $PARAMS
