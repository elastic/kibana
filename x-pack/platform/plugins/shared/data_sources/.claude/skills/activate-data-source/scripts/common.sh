#!/usr/bin/env bash
# Shim: sources the shared kibana-api utilities.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../../../../../../../../.. && pwd)"
source "$REPO_ROOT/.claude/skills/kibana-api/scripts/common.sh"
