#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh

cd test/package
vagrant up docker --no-provision
vagrant provision docker
cd -

node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.50.1 \
  -E discovery.type=single-node \
  --license=trial

export TEST_BROWSER_HEADLESS=1
export TEST_KIBANA_URL=http://elastic:changeme@192.168.50.7:5601
export TEST_ES_URL=http://elastic:changeme@192.168.50.1:9200

node scripts/functional_test_runner.js --include-tags=smoke
