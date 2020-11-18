#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

# Runs pre-commit hook script for the files touched in the last commit.
# That way we can ensure a set of quick commit checks earlier as we removed
# the pre-commit hook installation by default.
# If files are more than 200 we will skip it and just use
# the further ci steps that already check linting and file casing for the entire repo.
checks-reporter-with-killswitch "Quick commit checks" \
  commit_check_runner.sh
