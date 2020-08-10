#!/usr/bin/env bash
set -e

CURRENT_DIR=$(pwd)

# Copy everything except node_modules into the current workspace
rsync -a ${WORKSPACE}/kibana/* . --exclude node_modules
rsync -a ${WORKSPACE}/kibana/.??* .

# Symlink all non-root, non-fixture node_modules into our new workspace
cd ${WORKSPACE}/kibana
find . -type d -name node_modules -not -path '*__fixtures__*' -not -path './node_modules*' -prune -print0 | xargs -0I % ln -s "${WORKSPACE}/kibana/%" "${CURRENT_DIR}/%"
find . -type d -wholename '*__fixtures__*node_modules' -not -path './node_modules*' -prune -print0 | xargs -0I % cp -R "${WORKSPACE}/kibana/%" "${CURRENT_DIR}/%"
cd "${CURRENT_DIR}"

# Symlink all of the individual root-level node_modules into the node_modules/ directory
mkdir -p node_modules
ln -s ${WORKSPACE}/kibana/node_modules/* node_modules/
ln -s ${WORKSPACE}/kibana/node_modules/.??* node_modules/

# Copy a few node_modules instead of symlinking them. They don't work correctly if symlinked
unlink node_modules/@kbn
unlink node_modules/css-loader
unlink node_modules/style-loader

# packages/kbn-optimizer/src/integration_tests/basic_optimization.test.ts will fail if this is a symlink
unlink node_modules/val-loader

cp -R ${WORKSPACE}/kibana/node_modules/@kbn node_modules/
cp -R ${WORKSPACE}/kibana/node_modules/css-loader node_modules/
cp -R ${WORKSPACE}/kibana/node_modules/style-loader node_modules/
cp -R ${WORKSPACE}/kibana/node_modules/val-loader node_modules/
