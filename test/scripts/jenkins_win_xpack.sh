#!/usr/bin/bash

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
 
# Install Dir
installDir=$(pwd)
mkdir -p "$installDir" 

# Get Version
pkg_version=$(jq -r .version package.json)
version=${TEST_ES_BRANCH:=${pkg_version}-SNAPSHOT}

# Download Kibana Package 
kibanaUrl="https://snapshots.elastic.co/downloads/kibana/kibana-${version}-windows-x86_64.zip"
echo " -- downloading kibanaUrl from $kibanaUrl"
kibanaPkg="$installDir/${kibanaUrl##*/}"
curl --silent -o $kibanaPkg $kibanaUrl
kibanaDir="$installDir/$(zipinfo -1 $kibanaPkg | head -n 1)"
if [ -d "$kibanaDir" ]; then
    echo " -- clearing previous kibana install"
    rm -rf "$kibanaDir"
fi
unzip -qo $kibanaPkg -d $installDir

export XPACK_DIR="$(cd "$(dirname "$0")/../../x-pack"; pwd)"
echo "-> XPACK_DIR ${XPACK_DIR}"

export TEST_BROWSER_HEADLESS=1

echo " -> Running mocha tests"
cd "$XPACK_DIR"
yarn test
echo ""
echo ""

echo " -> Running jest tests"
cd "$XPACK_DIR"
node scripts/jest --ci --no-cache --verbose
echo ""
echo ""

echo " -> Running functional and api tests"
cd "$XPACK_DIR" 
node scripts/functional_tests \
  --bail \
  --kibana-install-dir=${kibanaDir} \
  --esFrom=snapshot \
  --debug
echo ""
echo ""
