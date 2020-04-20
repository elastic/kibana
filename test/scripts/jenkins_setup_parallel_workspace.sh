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

# Copy @kbn instead of symlinking it. It's small and many path-related things (e.g. REPO_ROOT) don't work correctly if it is symlinked
unlink node_modules/@kbn
cp -R ${WORKSPACE}/kibana/node_modules/@kbn node_modules/
