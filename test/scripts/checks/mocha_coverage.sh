#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

yarn nyc --reporter=html --reporter=json-summary --report-dir=./target/kibana-coverage/mocha node scripts/mocha
