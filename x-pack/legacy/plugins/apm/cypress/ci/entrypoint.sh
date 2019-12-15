#!/usr/bin/env bash
set -xe

## host.docker.internal is not available in native docker installations
kibana=$(dig +short host.docker.internal)
if [ -z "${kibana}" ] ; then
  kibana=127.0.0.1
fi

export CYPRESS_BASE_URL=http://${kibana}:5601

## To avoid issues with the home and caching artifacts
export HOME=/tmp
npm config set cache ${HOME}

## To avoid issues with volumes.
#rsync -rv --exclude=.git --exclude=docs \
#      --exclude=.cache --exclude=node_modules \
#      --exclude=test/ \
#      --exclude=src/ \
#      --exclude=packages/ \
#      --exclude=built_assets  --exclude=target \
#      --exclude=data /app ${HOME}/
#cd ${HOME}/app/x-pack/legacy/plugins/apm/cypress

cd /app/x-pack/legacy/plugins/apm/cypress
## Install dependencies for cypress
CI=true npm install
yarn install

# Wait for the kibana to be up and running
npm install wait-on
./node_modules/.bin/wait-on ${CYPRESS_BASE_URL}/status && echo 'Kibana is up and running'

# Run cypress
./node_modules/.bin/cypress run
