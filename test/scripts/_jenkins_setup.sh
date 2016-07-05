#!/usr/bin/env bash

set -e

###*****###
### CWD ###
###*****###
if [ -n "$WORKSPACE" ]; then
  cd "$WORKSPACE"
else
  echo 'Unable to find the $WORKSPACE environment variable, is this jenkins?'
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
### NPM ###
###*****###
npm install


if [ -z "$(npm bin)" ]; then
  echo "npm does not know where it stores executables..... huh??"
  exit 1
fi
