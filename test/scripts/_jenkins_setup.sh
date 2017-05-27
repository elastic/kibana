#!/usr/bin/env bash

set -e

###*****###
### CWD ###
###*****###
if [ -n "$WORKSPACE" ]; then
  cd "$WORKSPACE"
else
  echo "Unable to find the $WORKSPACE environment variable, is this jenkins?"
  exit 1
fi


###*****###
### NVM ###
###*****###
export NVM_DIR="/var/lib/jenkins/.nvm"
NVM_SCRIPT="$NVM_DIR/nvm.sh"
if [ -s "$NVM_SCRIPT" ]; then
  . "$NVM_SCRIPT"  # load nvm
else
  echo "Unable to find the nvm script at \"$NVM_SCRIPT\""
  exit 1
fi

nvm install "$(cat .node-version)"

###*****###
### yarn ###
###*****###
mkdir .bin
curl -L https://github.com/yarnpkg/yarn/releases/download/v0.24.2/yarn-0.24.2.js > .bin/yarn
chmod +x .bin/yarn
PATH="$(pwd)/.bin:$PATH"
yarn
