#!/usr/bin/bash

source "$(dirname $0)/../../src/dev/ci_setup/setup.sh"
 
# Install Dir
installDir=$(pwd)
mkdir -p "$installDir" 

# Get Version
pkg_version=$(cat package.json | grep "\"version\"" | cut -d ':' -f 2 | tr -d ",\"\ +")
version=${TEST_ES_BRANCH:=${pkg_version}-SNAPSHOT}

# Download Kibana Package 
kibanaUrl="https://snapshots.elastic.co/downloads/kibana/kibana-oss-${version}-windows-x86_64.zip"
echo " -- downloading kibanaUrl from $kibanaUrl"
kibanaPkg="$installDir/${kibanaUrl##*/}"
curl --silent -o $kibanaPkg $kibanaUrl
kibanaDir="$installDir/$(zipinfo -1 $kibanaPkg | head -n 1)"
if [ -d "$kibanaDir" ]; then
    echo " -- clearing previous kibana install"
    rm -rf "$kibanaDir"
fi
unzip -qo $kibanaPkg -d $installDir

# Run Tests
echo "Run tests"
export TEST_BROWSER_HEADLESS=1
node scripts/functional_tests \
  --kibana-install-dir=${kibanaDir} \
  --esFrom snapshot \
  --config test/functional/config.js \
  --debug
