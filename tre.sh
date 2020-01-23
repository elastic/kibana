#!/bin/bash

set -e

for arg in "$@"
do
    echo "$arg"
done


for x in jest functional mocha
do
  echo "### x: node scripts/ingest_coverage.js --verbose --path target/kibana-coverage/${x}-combined/coverage-summary.json"
#  node scripts/ingest_coverage.js --verbose --path target/kibana-coverage/mocha-combined/coverage-summary.json || echo "### target/kibana-coverage/mocha-combined/coverage-summary.json not found?"

done


