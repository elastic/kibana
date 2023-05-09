#!/usr/bin/env bash

set -euo pipefail

echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
pushd packages/kbn-test/new_test_runner > /dev/null
tgt="../../../target/junit"
node --test-reporter=./lifecycle_gen.mjs --test
popd > /dev/null
