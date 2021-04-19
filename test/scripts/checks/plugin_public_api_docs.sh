#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

###
### rebuild plugin api docs to ensure it's not out of date
###
echo " -- building api docs"
node scripts/build_api_docs

###
### verify no api changes
###
### GIT_CHANGES="$(git ls-files --modified)"

### if [ "$GIT_CHANGES" ]; then
###   echo -e "\n${RED}ERROR: 'node scripts/build_api_docs' caused changes to the following files:${C_RESET}\n"
###   echo -e "$GIT_CHANGES\n"
###   exit 1
### fi
