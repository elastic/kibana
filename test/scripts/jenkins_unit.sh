#!/usr/bin/env bash

set -e

export TEST_BROWSER_HEADLESS=1

## TODO: remove before merging and commit auto fixed source
echo " -- autofixing eslint violations"
node scripts/eslint --fix || true

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
