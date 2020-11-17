#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

function run_quick_commit_checks() {
  node scripts/precommit_hook.js \
    --ref HEAD~1..HEAD \
    --max-files 200 \
    --verbose || return 1
}

# Runs pre-commit hook script for the files touched in the last commit.
# That way we can ensure a set of quick commit checks earlier as we removed
# the pre-commit hook installation by default.
# If files are more than 200 we will skip it and just use
# the further ci steps that already check linting and file casing for the entire repo.
checks-reporter-with-killswitch "Quick commit checks" \
  run_quick_commit_checks || {
    echo "Quick commit checks failed.";
    echo "You reproduce that locally by running 'node scripts/precommit_hook.js --ref HEAD~1..HEAD --max-files 200'";

    echo "!!!!!!!! ATTENTION !!!!!!!!"
    echo "That check is intended to provide earlier CI feedback after we remove the automatic install for the local pre-commit hook.";
    echo "If you want, you can still manually install the pre-commit hook locally by running 'node scripts/register_git_hook locally'";

    exit 1;
}
