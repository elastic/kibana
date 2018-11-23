#!/usr/bin/env bash

set -e
source "$(dirname "$0")/../../src/dev/ci_setup/setup.sh"
source "$(dirname "$0")/../../src/dev/ci_setup/git_setup.sh"
source "$(dirname "$0")/../../src/dev/ci_setup/java_setup.sh"

"$(FORCE_COLOR=0 yarn bin)/grunt" functionalTests:ensureAllTestsInCiGroup;

export KBN_INSTALL_DIR="$PARENT_DIR/install/kibana"

node scripts/build --debug --oss --skip-archives --install-dir "$KBN_INSTALL_DIR";

export TEST_BROWSER_HEADLESS=1
export TEST_ES_FROM=${TEST_ES_FROM:-source}

"$(FORCE_COLOR=0 yarn bin)/grunt" "run:functionalTests_ciGroup${CI_GROUP}" --from=source;

if [ "$CI_GROUP" == "1" ]; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" run:pluginFunctionalTestsRelease --from=source;
fi
