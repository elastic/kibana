#!/usr/bin/env bash

set -euo pipefail

echo "--- Install, Test and Report (junit)"
.buildkite/scripts/steps/nodejs_std_test_runner/junit_reporter.sh -i true -r true
