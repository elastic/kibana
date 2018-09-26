#!/usr/bin/env bash

set -e

###
### "install" yarn into this shell
###
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"
yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
yarnDir="$cacheDir/yarn/$yarnVersion"
export PATH="$yarnDir/bin:$PATH"
yarnGlobalDir="$(yarn global bin)"
export PATH="$PATH:$yarnGlobalDir"
hash -r

xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:report;
