source test/scripts/jenkins_test_setup.sh

installDir="$(realpath $PARENT_DIR/kibana/build/oss/kibana-*-SNAPSHOT-linux-x86_64)"
destDir=${installDir}-${CI_WORKER_NUMBER}
cp -R "$installDir" "$destDir"

export KIBANA_INSTALL_DIR="$destDir"
