#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

###
### rebuild plugin api docs to ensure it's not out of date
###
echo " -- building api docs"
node --max-old-space-size=12000 scripts/build_api_docs
