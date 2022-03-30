#!/usr/bin/env bash

set -euo pipefail

TEST_PACKAGE="rdocker"

if [[ "$TEST_PACKAGE" == "deb" ]] || [[ "$TEST_PACKAGE" == "rpm" ]]; then
  trap "vagrant ssh $TEST_PACKAGE --command 'sudo cat /var/log/kibana/kibana.log'" EXIT
elif [[ "$TEST_PACKAGE" == "docker" ]]; then
  trap "vagrant ssh $TEST_PACKAGE --command 'sudo docker logs kibana'" EXIT
fi