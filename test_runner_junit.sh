#!/usr/bin/env bash

set -euo pipefail

echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
pushd packages/kbn-test/new_test_runner > /dev/null
tgt="../../../target/junit"
# shutdown() {
#   exit_code=$?

#   echo "### tgt: ${tgt}"
#   echo "### Contents of ${tgt}:"
#   ls -la "$tgt"

#   exit $exit_code
# }
# trap "shutdown" EXIT
node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$tgt"
#npx junit2json target/junit/tap.xml | jq
ls -R "$tgt"
popd > /dev/null
