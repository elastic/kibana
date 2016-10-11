#!/usr/bin/env bash

set -e

if [ "$NODE_VERSION" != "$(cat .node-version)" ]; then
  echo "incorrect node.js version ($NODE_VERSION) installed. The Dockerfile needs updating"
  exit 1
fi

# redirect tree output to /dev/null, warns/errs go to stderr
npm install --quiet > /dev/null
