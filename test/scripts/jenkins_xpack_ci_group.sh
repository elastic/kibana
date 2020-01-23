#!/usr/bin/env bash

source test/scripts/jenkins_test_setup.sh

if [[ -z "$CODE_COVERAGE" ]] ; then
  if [[ -z "$IS_PIPELINE_JOB" ]] ; then
    echo " -> Ensuring all functional tests are in a ciGroup"
    cd "$XPACK_DIR"
    node scripts/functional_tests --assert-none-excluded \
      --include-tag ciGroup1 \
      --include-tag ciGroup2 \
      --include-tag ciGroup3 \
      --include-tag ciGroup4 \
      --include-tag ciGroup5 \
      --include-tag ciGroup6 \
      --include-tag ciGroup7 \
      --include-tag ciGroup8 \
      --include-tag ciGroup9 \
      --include-tag ciGroup10
  fi

  cd "$KIBANA_DIR"

  if [[ -z "$IS_PIPELINE_JOB" ]] ; then
    echo " -> building and extracting default Kibana distributable for use in functional tests"
    node scripts/build --debug --no-oss

    linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
    installDir="$PARENT_DIR/install/kibana"

    mkdir -p "$installDir"
    tar -xzf "$linuxBuild" -C "$installDir" --strip=1

    export KIBANA_INSTALL_DIR="$installDir"
  else
    installDir="$PARENT_DIR/install/kibana"
    destDir="${installDir}-${CI_WORKER_NUMBER}"
    cp -R "$installDir" "$destDir"

    export KIBANA_INSTALL_DIR="$destDir"
  fi

  echo " -> Running functional and api tests"
  cd "$XPACK_DIR"

  checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
    node scripts/functional_tests \
      --debug --bail \
      --kibana-install-dir "$KIBANA_INSTALL_DIR" \
      --include-tag "ciGroup$CI_GROUP"

  echo ""
  echo ""
else
  echo " -> Running X-Pack functional tests with code coverage"

  export NODE_OPTIONS=--max_old_space_size=8192

  echo " -> making hard link clones"
  cd ..
  cp -RlP kibana "kibana${CI_GROUP}"
  rm "kibana${CI_GROUP}"/config/kibana.yml
  cp kibana/config/kibana.yml "kibana${CI_GROUP}"/config/kibana.yml
  cd "kibana${CI_GROUP}/x-pack"

  echo " -> running tests from the clone folder"

  node scripts/functional_tests --debug --include-tag "ciGroup$CI_GROUP"

  if [[ -d ../target/kibana-coverage/functional ]]
  then
    echo " -> replacing kibana${CI_GROUP} with kibana in json files"
    sed -i "s|kibana${CI_GROUP}|kibana|g" ../target/kibana-coverage/functional/*.json
    echo " -> copying coverage to the original folder"
    mkdir -p ../../kibana/target/kibana-coverage/functional
    cp -R ../target/kibana-coverage/functional/. ../../kibana/target/kibana-coverage/functional/
  fi
fi
