#!/usr/bin/env bash

node scripts/build --all-platforms --debug --no-oss

vagrant up rpm --no-provision
vagrant provision rpm

node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.50.1 \
  -E discovery.type=single-node \
  --license=trial

TEST_KIBANA_URL=http://elastic:changeme@192.168.50.6:5601 \
TEST_ES_URL=http://elastic:changeme@192.168.50.1:9200 \
  node scripts/functional_test_runner.js --config x-pack/test/packaging/config.ts