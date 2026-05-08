#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
node "$REPO_ROOT/scripts/generate_tsconfig_runtime.js"
# Cypress embeds tsx; it reads TSX_TSCONFIG_PATH (not TSX_TSCONFIG) for path resolution
export TSX_TSCONFIG_PATH="$REPO_ROOT/tsconfig.runtime.json"
cd "$REPO_ROOT/x-pack/solutions/security/test/security_solution_cypress"
yarn cypress:ess --spec './cypress/e2e/detection_response/**/bulk_edit_rules.cy.ts' | tee "$REPO_ROOT/test_cypress.log"
