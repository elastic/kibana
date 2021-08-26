#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh

mkdir -p target
gsutil -q -m cp "gs://ci-artifacts.kibana.dev/package-testing/$GIT_COMMIT/kibana-[0-9]*-docker-image.tar.gz" ./target

export VAGRANT_CWD=test/package
vagrant up docker --no-provision

node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.50.1 \
  -E discovery.type=single-node \
  --license=trial &
while ! timeout 1 bash -c "echo > /dev/tcp/localhost/9200"; do sleep 30; done

vagrant provision docker

export TEST_BROWSER_HEADLESS=1
export TEST_KIBANA_URL=http://elastic:changeme@192.168.50.7:5601
export TEST_ES_URL=http://elastic:changeme@192.168.50.1:9200

cd x-pack
node scripts/functional_test_runner.js --include-tag=smoke
