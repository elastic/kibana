#!/usr/bin/env bash

while getopts s: flag
do
    case "${flag}" in
        s) simulations=${OPTARG};;
    esac
done
echo "Simulation classes: $simulations";

cd "$KIBANA_DIR"
#source src/dev/ci_setup/setup_env.sh

#if [[ ! "$TASK_QUEUE_PROCESS_ID" ]]; then
#  ./test/scripts/jenkins_xpack_build_plugins.sh
#fi

# Configuring Metricbeat monitoring for the load testing
# Getting the URL
TOP="$(curl -L http://snapshots.elastic.co/latest/master.json)"
MB_BUILD=$(echo $TOP | sed 's/.*"version" : "\(.*\)", "build_id.*/\1/')
echo $MB_BUILD
MB_BUILD_ID=$(echo $TOP | sed 's/.*"build_id" : "\(.*\)", "manifest_url.*/\1/')

URL=https://snapshots.elastic.co/${MB_BUILD_ID}/downloads/beats/metricbeat/metricbeat-${MB_BUILD}-linux-x86_64.tar.gz
echo $URL
# Downloading the Metricbeat package
while [ 1 ]; do
    wget -q --retry-connrefused --waitretry=1 --read-timeout=20 --timeout=15 -t 0 --continue --no-check-certificate --tries=3 $URL
    if [ $? = 0 ]; then break; fi; # check return value, break if successful (0)
       sleep 1s;
    done;


# Install Metricbeat
echo "untar metricbeat and config"
tar -xzf metricbeat-${MB_BUILD}-linux-x86_64.tar.gz
#--directory "$KIBANA_DIR"
ls -l
echo "rename"
mv "$KIBANA_DIR"/metricbeat-${MB_BUILD}-linux-x86_64 "$KIBANA_DIR"/metricbeat-install
ls -l
# Configure Metricbeat

pushd "$KIBANA_DIR"/metricbeat-install
echo "check inside folder"
ls -l
popd

echo "Changing metricbeat config"
pushd ../kibana-load-testing
cp cfg/metricbeat/elasticsearch-xpack.yml "$KIBANA_DIR"/metricbeat-install/modules.d/elasticsearch-xpack.yml
cp cfg/metricbeat/kibana-xpack.yml "$KIBANA_DIR"/metricbeat-install/modules.d/elasticsearch-xpack.yml
echo "fields.build: ${BUILD_ID}" >> cfg/metricbeat/metricbeat.yml
cp cfg/metricbeat/metricbeat.yml "$KIBANA_DIR"/metricbeat-install/metricbeat.yml
mv "$KIBANA_DIR"/metricbeat-install/modules.d/system.yml "$KIBANA_DIR"/metricbeat-install/modules.d/system.yml.disabled
popd

# doesn't persist, also set in kibanaPipeline.groovy
export KBN_NP_PLUGINS_BUILT=true

#echo " -> building and extracting default Kibana distributable for use in functional tests"
#cd "$KIBANA_DIR"
#node scripts/build --debug --no-oss
#linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
#installDir="$KIBANA_DIR/install/kibana"
#mkdir -p "$installDir"
#tar -xzf "$linuxBuild" -C "$installDir" --strip=1

#mkdir -p "$WORKSPACE/kibana-build-xpack"
#cp -pR install/kibana/. $WORKSPACE/kibana-build-xpack/

#echo " -> test setup"
#source test/scripts/jenkins_test_setup_xpack.sh

# Start Metricbeat
echo "Starting metricbeat"
nohup "$KIBANA_DIR"/metricbeat-install/metricbeat > "$KIBANA_DIR"/metricbeat-install/logs/metricbeat.log 2>&1 &

echo " -> run gatling load testing"
export GATLING_SIMULATIONS="$simulations"
#node scripts/functional_tests \
#  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
#  --config test/load/config.ts
  
echo "output of metricbeat.log" 
cat "$KIBANA_DIR"/metricbeat-install/logs/metricbeat.log
