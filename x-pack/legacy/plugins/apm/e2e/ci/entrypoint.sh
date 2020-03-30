#!/usr/bin/env bash
set -xe

## host.docker.internal is not available in native docker installations
kibana=$(dig +short host.docker.internal)
if [ -z "${kibana}" ] ; then
  kibana=127.0.0.1
fi

export CYPRESS_BASE_URL=http://${kibana}:5701

## To avoid issues with the home and caching artifacts
export HOME=/tmp
npm config set cache ${HOME}

## Install dependencies for cypress
CI=true npm install
yarn

# Wait for the kibana to be up and running
npm install wait-on
./node_modules/.bin/wait-on ${CYPRESS_BASE_URL}/status && echo 'Kibana is up and running'

# Run cypress
npm run cypress:run
