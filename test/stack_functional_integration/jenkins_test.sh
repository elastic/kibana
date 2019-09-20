#!/usr/bin/env bash


# You can set environment variables for VMS, BRANCH, MANIFEST, BUILD, and MODE

# VMS must match a config.vm.define name in Vagrantfile.

# Be careful with BRANCH because the installation and tests for one branch may not work or pass on another branch.

# If MANIFEST=staging then you must also include a BUILD, ex:BUILD=6.5.1-0f1b952c

# MODE defaults to "install".  Other options are "restore" and "upgrade"
# (the VMS variable is not required or used in these cases.  It uses qa/envvars.sh to figure it out).

# example:  BRANCH=staging BUILD=6.5.1-123456 VMS=w2012_ie ./jenkins_test.sh

set -e
set -x

# if [ -z BLAH ] = True if the length of string is zero.
if [ -z "${MANIFEST}" ]; then
  MANIFEST=snapshots; BRANCH=master
 # MANIFEST=staging; BUILD=7.3.0-a07f8500
  # MANIFEST=artifacts;  BUILD=7.3.0
fi

echo $PATH
VBoxManage --help || echo "Please add VBoxManage to the path"

# If the input array (function or script input params) contains the string "help"
if [[ "$@" =~ "help" ]]; then
  set +x
  echo -e "\njenkins_test.sh Usage:\n"
  echo -e "This script detects if a WORKSPACE variable exists and if it does,\nruns like a Jenkins job, else, runs like a local job.\n"
  echo -e "One difference is that local jobs save a snapshot of the VM after \nphase1 (download and install) is complete."
  echo -e "This allows faster debugging using MODE=restore.  With this setting \nthe VM is restored and then phase2 (configuring and starting),\nthen Selenium tests are run\n"
  echo -e "PARAMETERS: (these are actually environment variables that can be set before starting jenkins_test.sh)\n"
  echo -e "BUILD - Can include a SNAPSHOT (pulls from snapshots.elastic.co)\n        or staging build hash (pulls from staging.elastic.co)."
  echo -e "        If neither of those match, then it's assumed to be a released build (pulls from artifacts.elastic.co)"
  echo -e "        Examples: 6.0.0-rc2-SNAPSHOT, 6.0.0-rc2-abcd1234, 6.0.0-rc1"
  TEMPBUILD=`curl -s https://raw.githubusercontent.com/elastic/kibana/${BRANCH}/package.json | grep "\"version\":" | cut -d: -f2 | tr -d '," '`
  echo -e "      * Default value if not specified is the current SNAPSHOT of this ${BRANCH} branch \"${TEMPBUILD}-SNAPSHOT\"\n"
  echo -e "VMS   - VM name or list of VM names"
  echo -e "      * Default for local runs is \"${VMS}\"\n"
  echo -e "MODE  - [restore] optional MODE=restore will revert your current VM to the phase1 snapshot\n"
  echo -e "Examples:"
  echo -e "         ./jenkins_test.sh                                                  Runs all VMs one after another on the current SNAPSHOT build"
  echo -e "         VMS=w2012_zip ./jenkins_test.sh                                    Runs the Windows 2012 Server VM on the current SNAPSHOT build"
  echo -e "         VMS=w2012_zip BUILD=6.0.0-rc1 MANIFEST=staging ./jenkins_test.sh   Runs the Windows 2012 Server VM on the 6.0.0-rc1 released build"
  echo -e "         VMS=w2012_zip MODE=restore ./jenkins_test.sh                       Restores the Windows VM to phase1 and continues from that point"
  echo -e "         VMS=w2012_zip MODE=retest ./jenkins_test.sh                        Restores the Windows VM to phase2 and continues from that point"
  exit
fi


function cleanup {
  STATUS=$?
  echo "********************** cleanup ******  STATUS=$STATUS *** TESTSTATUS=$TESTSTATUS ***********"
  set +e
  kill $(ps -ef | grep "[t]ail -F qa/install" | awk '{print $2}')
  if [ -n "$WORKSPACE" ]; then
    vagrant destroy -f
    ps -ef | grep -v grep | grep VBoxHeadless && kill $(ps -ef | grep -v grep | grep VBoxHeadless | awk '{print $2}') || echo "no VBoxHeadless to kill"
    # when run as a jenkins job let's clean up all these builds
    rm downloads/* || echo "no downloads to delete"
  fi
  pwd
  cat completed.txt
  if [[ `grep successfully completed.txt` ]]; then
    echo -e "\n-- `date` ------------------- finished successfully ${BUILD}"
    exit 0
  else
    echo -e "\n-- `date` ------------------- failed during ${vm} ${BUILD}"
    exit 1
  fi
}

function phase2 {
  # do phase2
  . ./qa/envvars.sh
  if [ -f qa/phase2.marker ]; then rm qa/phase2.marker; fi
    echo -e "\n-- `date` ------------------- Provisioning phase2 starting for $vm ${BUILD}"
    if [ "${VMOS}" = "windows" ]; then
      echo "`date` jenkins_test starting provisioning phase2 on $vm ${BUILD}" > qa/install_phase2.log
      tail -F qa/install_phase2.log &
      logProcess=$!
      time vagrant winrm $vm -c "C:\vagrant\qa\phase2.bat"
      kill -9 $logProcess
    else
      if [ "${vm}" != "ubuntu18_docker" ]; then
        time vagrant ssh $vm -c "sudo /vagrant/qa/phase2.sh"  -- -T
      else
        time vagrant ssh $vm -c "sudo /vagrant/qa/docker_phase2.sh"  -- -T
      fi
    fi
    grep SUCCESS qa/phase2.marker || exit 1
    echo -e "\n-- `date` ------------------- Provisioning phase2 completed for $vm ${BUILD}"
    sleep 30

  # makelogs for test data
    curl --insecure $ESURL
    echo n|./node_modules/@elastic/makelogs/bin/makelogs --indexPrefix=makelogs工程- --url=$ESURL
    # use CCR to replicate this data instead of writing it to the remote Cluster
    if  [ "${vm}" = "ubuntu16_tar_ccs" ]; then
      curl --insecure -XPUT "$ESURLDATA/makelogs%e5%b7%a5%e7%a8%8b-0_f/_ccr/follow"  -H 'Content-Type: application/json' --data-binary @makelogs.json
      echo -e "\n"
    fi

    # if we're not installing logstash, use makelogs to fake it.
    # The first management test expects to create the default logstash-* index pattern
    if [[ ! $PRODUCTS =~ .*logstash.* ]]; then
      echo n|./node_modules/@elastic/makelogs/bin/makelogs --url=$ESURL
    fi

  # log indices data to console
    set +x # Turn off simple tracing
    curl -s  -k $ESURL/_cat/indices?v | head -n1; echo "."
    curl -s  -k $ESURL/_cat/indices | head -n+40 | sort
    set -x # Turn on simple tracing

  # check that all indices have expected data
    # logstash takes a little while to start up and write data, will it be ready in time?
    for index in .kibana makelogs; do
      if [ ! `node -pe 'JSON.parse(process.argv[1]).count' "$(curl -s -k $ESURL/${index}*/_count)"` -gt 0 ]; then
        echo "Failed to find ${index} count > 0"
        exit 1
      fi
    done

    for index in $BEATS; do
      if [ ! `node -pe 'JSON.parse(process.argv[1]).count' "$(curl -s -k $ESURL/${index}-*/_count)"` -gt 0 ]; then
        echo "Failed to find ${index} count > 0"
        exit 1
      fi
    done

    if [[ $PRODUCTS =~ .*apm-server.* ]]; then
      if [ ! `node -pe 'JSON.parse(process.argv[1]).count' "$(curl -s -k $ESURL/apm*/_count)"` -gt 0 ]; then
        echo "Failed to find apm* count > 0"
        exit 1
      fi
    fi
    sleep 60

    if [[ $PRODUCTS =~ .*logstash.* ]]; then
      if [ ! `node -pe 'JSON.parse(process.argv[1]).count' "$(curl -s -k $ESURL/logstash-*/_count)"` -gt 0 ]; then
        echo "Failed to find logstash-* count > 0"
        exit 1
      fi
    fi

    if [ "$XPACK" = "YES" ]; then
      if [ "$SECURITY" = "YES" ]; then
        for index in .security; do
          if [ ! `node -pe 'JSON.parse(process.argv[1]).count' "$(curl -s -k $ESURL/${index}/_count)"` -gt 0 ]; then
            echo "Failed to find ${index} count > 0"
            exit 1
          fi
        done
      fi
    fi
  if [ "${VM}" == "ubuntu18_deb_oidc" ]; then
	echo VERSION_NUMBER=`node -pe 'JSON.parse(process.argv[1]).version.number' "$(curl -s -k https://elastic:changeit@localhost:5601/api/status)"` >> qa/envvars.sh
	echo VERSION_BUILD_HASH=`node -pe 'JSON.parse(process.argv[1]).version.build_hash' "$(curl -s -k https://elastic:changeit@localhost:5601/api/status)"` >> qa/envvars.sh
  else
	echo VERSION_NUMBER=`node -pe 'JSON.parse(process.argv[1]).version.number' "$(curl -s -k ${KIBANAURL}/api/status)"` >> qa/envvars.sh
	echo VERSION_BUILD_HASH=`node -pe 'JSON.parse(process.argv[1]).version.build_hash' "$(curl -s -k ${KIBANAURL}/api/status)"` >> qa/envvars.sh
  fi


  # only when running locally, save a snapshot after phase2 is complete so we can restore and run tests clean
  if [ -z "$WORKSPACE" ]; then
    vagrant snapshot save --force $vm phase2
  fi

}

function runTests {
  set -e
  if [ "${VM}" == "ubuntu16_deb_desktop_saml" ]; then
    npm run test:ui:runvm
  elif [ "${VM}" == "w2012_ie" ]; then
  vagrant winrm w2012_ie -s cmd -c "C:\vagrant\qa\configure_selenium.bat"
  echo KIBANAURL=https://elastic:changeit@10.0.2.15:5601 >> qa/envvars.sh
  BROWSER="internet explorer" npm run test:ui:ie
  elif [ "${VM}" == "ubuntu16_deb_desktop_oidc" ]; then
  npm run test:ui:runvm
  elif [ "${VM}" == "ubuntu16_deb_desktop_krb" ]; then
  npm run test:ui:runvm
  else
    # if WORKSPACE (Jenkins) then run the Selenium tests HEADLESS (xvfb-run)
    $HEADLESS npm run test:ui:runner
  fi
  TESTSTATUS=$?
  echo -e "\n-- `date` ------------------- Testing completed for $vm ${BUILD} exit status=${TESTSTATUS}"
}

function planArtifacts {
  # figure out BRANCH/BUILD/MANIFEST/VERSION/SNAPSHOT parameters
  case $MANIFEST in
      snapshots)
        TOP="`curl -s -L http://${MANIFEST}.elastic.co/latest/${BRANCH}.json`"
        # TOP='{
        #     "version": "6.5.2-SNAPSHOT",
        #     "build_id": "6.5.2-e83cd0e7",
        #     "manifest_url": "https://snapshots.elastic.co/6.5.2-e83cd0e7/manifest-6.5.2-SNAPSHOT.json",
        #     "summary_url": "https://snapshots.elastic.co/6.5.2-e83cd0e7/summary-6.5.2-SNAPSHOT.html"
        # }'
        # in these scripts VERSION=6.5.2 and SNAPSHOT=-SNAPSHOT
        BUILD=`node -pe 'JSON.parse(process.argv[1]).version' "$TOP"`
        echo $BUILD
        BUILD_ID=`node -pe 'JSON.parse(process.argv[1]).build_id' "$TOP"`
        echo $BUILD_ID
        VERSION=`echo $BUILD | sed 's|\(.*\)-\(........\)|\1|'`
        echo $VERSION
        MANI_URL=`node -pe 'JSON.parse(process.argv[1]).manifest_url' "${TOP}"`
        rm manifest*.json* || echo "no previous manifest files to remove"
        wget $MANI_URL
        SNAPSHOT=-SNAPSHOT
        # don't we need to set VERSION here?
      ;;

      staging)
        VERSION=`echo $BUILD | sed 's|\(.*\)-\(........\)|\1|'`
        MANI_URL="http://${MANIFEST}.elastic.co/${BUILD}/manifest-${VERSION}.json"
        rm manifest*.json* || echo "no previous manifest files to remove"
        wget $MANI_URL
        SNAPSHOT=
        BUILD_ID=$BUILD
      ;;

      artifacts)
        SNAPSHOT=
        VERSION=$BUILD
        BUILD_ID=$BUILD
        # no manifest for released artifacts yet
        # https://github.com/elastic/release-manager/issues/455
        rm manifest*.json* || echo "no previous manifest files to remove"
        echo "************************** At least the elasticsearch links need to be updated before they will work on 7.0.1+ **** "
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${BUILD}.zip\"\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-oss-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${BUILD}.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-oss-${BUILD}.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch-hadoop/elasticsearch-hadoop-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/kibana/kibana-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-${BUILD}.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-${BUILD}.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-${BUILD}.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-oss-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-oss-${BUILD}.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-oss-${BUILD}.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/logstash/logstash-oss-${BUILD}.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/beats/beats-dashboards/beats-dashboards-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-windows-x86.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-linux-x86.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-linux-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-darwin-x86_64.tar.gz\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-i386.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-amd64.deb\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-i686.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/apm-server/apm-server-oss-${BUILD}-x86_64.rpm\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-${BUILD}-darwin-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-debug-${BUILD}-darwin-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-${BUILD}-linux-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-debug-${BUILD}-linux-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-debug-${BUILD}-windows-x86_64.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/ml-cpp/ml-cpp-${BUILD}.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${BUILD}.msi\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/java-langserver-plugins/java-langserver/java-langserver-${BUILD}-windows.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/java-langserver-plugins/java-langserver/java-langserver-${BUILD}-linux.zip\"" >> manifest-${BUILD}.json
        echo "\"url\": \"https://artifacts.elastic.co/downloads/java-langserver-plugins/java-langserver/java-langserver-${BUILD}-darwin.zip\"" >> manifest-${BUILD}.json
      ;;
  esac
}


# set -x
###*****###
### CWD ###
###*****###
trap cleanup EXIT

if [ -n "$WORKSPACE" ]; then
  echo "This is a Jenkins run"
  cd "$WORKSPACE"
  ###*****###
  ### NVM ###
  ###*****###
#   export VERSION=v10.15.2

  # Don't exit on error when installing nvm.  It will return an error
  # status if the NVM_DIR is initially empty.
  set +e
  export NVM_DIR="/var/lib/jenkins/.nvm"
  NVM_SCRIPT="$NVM_DIR/nvm.sh"
  if [ -s "$NVM_SCRIPT" ]; then
    . "$NVM_SCRIPT"  # load nvm
  else
    echo "Unable to find the nvm script at \"$NVM_SCRIPT\""
  exit 1
  fi

  echo "****************** we finished the NVM_SCRIPT **********************"
  echo "****************** now install our node version ********************"
  NODE_VERSION=10.15.2
  nvm install $NODE_VERSION
  # && nvm alias default $NODE_VERSION \
  # && nvm use default $NODE_VERSION
  nvm use $NODE_VERSION
  # Return to exit on error
  set -e


  HEADLESS=xvfb-run
  MODE=install
  #VMS="debian-9_deb_oss centos6_rpm_oss ubuntu16_tar_oss w2016_zip_oss ubuntu16_tar_ccs centos7_rpm ubuntu18_docker w2012_ie ubuntu16_deb_desktop_saml ubuntu18_deb_oidc"
  VMS="ubuntu16_tar centos7_rpm centos6_rpm centos6_rpm_oss w2016_zip_oss ubuntu16_deb_desktop_saml ubuntu18_deb_oidc debian-9_deb_oss ubuntu16_tar_oss ubuntu16_tar_ccs ubuntu18_docker w2012_ie"
   #VMS="centos7_rpm"
  JENKINS=yes
  vagrant box update
else
  echo 'This is a local run (not Jenkins)'
  JENKINS=no
  HEADLESS=
  # True if the length of string is non-zero.
  if [ ! -n "$MODE" ]; then
    MODE=install
  fi
  # if we didn't pass in a "VMS=ubuntu_deb" parameter
  # True if the length of string is zero
  if [ -z "$VMS" ]; then
    # run this full set of VMs (check one of each build artifact first rpm, tar.gz, zip, deb)
    VMS="w2012_ie centos7_rpm ubuntu16_tar_ccs debian-9_deb_oss centos6_rpm centos6_rpm_oss ubuntu16_tar_oss w2016_zip_oss ubuntu18_deb_oidc"
  fi
fi

# the big switch for MODE=install/restore/upgrade
echo "`date` starting build ${BUILD} on VMS=$VMS" > completed.txt

case $MODE in
  install)
  ###*****###
  ### NPM ###
  ###*****###
  set +e
  npm install
  npm list makelogs
  find ./node_modules/ -name makelogs
  set -e

  planArtifacts

  for vm in ${VMS}; do (
      vagrant -v
    # destroy all VMs as a cleanup step
      time vagrant destroy -f || echo "No VMs to destroy"
      vagrant plugin list | grep -i vagrant-winrm && vagrant plugin uninstall vagrant-winrm
      ps -ef | grep -v grep | grep VBoxHeadless && kill $(ps -ef | grep -v grep | grep VBoxHeadless | awk '{print $2}')
      echo -e "\n-- `date` Provisioning started for $vm ${BUILD}"

    # create qa/envvars.sh with BUILD/SNAPSHOT/VERSION info
      # this first '>' wipes the previous envvars.sh file and starts a new one
      echo BUILD=$BUILD > qa/envvars.sh
      echo BUILD_ID=$BUILD_ID >> qa/envvars.sh
      echo SNAPSHOT=$SNAPSHOT >> qa/envvars.sh
      echo VERSION=$VERSION >> qa/envvars.sh
      # echo HASH=$HASH >> qa/envvars.sh
      echo BASEURL=$BASEURL >> qa/envvars.sh
      echo STARTEDBY=$HOSTNAME >> qa/envvars.sh
      echo JENKINS=$JENKINS >> qa/envvars.sh
      echo MANIFEST=$MANIFEST >> qa/envvars.sh
      echo "# Above vars written to qa/envvars.sh by jenkins_test.sh" >> qa/envvars.sh

      ls -l
      pwd
      pushd qa
        ../provision/${vm}.sh
        if [ "${vm}" != "ubuntu18_docker" ]; then
          . ./envvars.sh
          echo "`date` get_builds $vm ${BUILD}"
          . ./get_builds.sh
        fi
      popd

    # do phase1
    if [ "${vm}" = "w2012_zip" ] || [ "${vm}" = "w2016_zip_oss" ] || [ "${vm}" = "w10_zip" ] || [ "${vm}" = "w2012_ie" ]; then
      # pushd qa
      #   ../provision/${vm}.sh
      # popd

      # Start tailing the log that will be created (-F) in the background
      echo "`date` jenkins_test starting provision on $vm ${BUILD}" > qa/install.log
      tail -F qa/install.log &
      logProcess=$!
      time vagrant up $vm --provision
      # and kill the log afterwards
      kill -9 $logProcess
    else
      time vagrant up $vm --provision
    fi
    # make sure phase1 was successful
    grep SUCCESS qa/phase1.marker || exit 1
    # only when running locally, save a snapshot after phase1 is complete (saves a lot of time when debugging config issues)
    if [ ! -n "$WORKSPACE" ]; then
      # before we save any snapshot, we should copy the envvars.sh to someplace local on the VM (not in the share)
      vagrant snapshot save --force $vm phase1
    # clean up downloads if Jenkins
    else
     rm downloads/* || echo "no downloads to delete"
    fi
    echo -e "\n-- `date` ------------------- Provisioning phase1 completed for $vm ${BUILD}"

    phase2

    runTests

    echo "`date` ${TESTSTATUS} ${vm}" >> completed.txt
  ); done # end of for vm in ${VMS}; do (
  ;;


  restore)
    vm=`grep "VM=" qa/envvars.sh | cut -d= -f2`
    echo -e "\n-- `date` ------------------- Restoring phase1 for $vm ${BUILD}"
    vagrant halt $vm
    vagrant snapshot restore --no-provision $vm phase1

    phase2

    runTests
  ;;

  retest)
    vm=`grep "VM=" qa/envvars.sh | cut -d= -f2`
    echo -e "\n-- `date` ------------------- Restoring phase2 for $vm ${BUILD}"
    vagrant halt $vm
    vagrant snapshot restore --no-provision $vm phase2

    VM=$vm
    runTests
  ;;

  upgrade)
    # save a snapshot before upgrade so we can restore and try again
    vm=`grep "VM=" qa/envvars.sh | cut -d= -f2`
    vagrant snapshot save --force $vm phase3

    # we need to replace the VERSION in envvars with the new version we're going to upgrade to but keep everything else
    echo -e "\n-- `date` ------------------- upgrading `grep "VM=" ./qa/envvars.sh` from `grep VERSION ./qa/envvars.sh` to ${BUILD}"

    planArtifacts

    # update qa/envvars.sh with BUILD/SNAPSHOT/VERSION info
      sed -i "s|BUILD=.*|BUILD=${BUILD}|" qa/envvars.sh
      sed -i "s|VERSION=.*|VERSION=${VERSION}|" qa/envvars.sh
      . ./qa/envvars.sh

    # do phase3 upgrade
      echo -e "\n-- `date` ------------------- Provisioning phase3 starting for $vm ${BUILD}"
      . ./qa/envvars.sh
      if [ "${VMOS}" = "windows" ]; then
        echo "`date` jenkins_test starting provisioning phase2 on $vm ${BUILD}" > qa/install_phase2.log
        # tail -F qa/install_phase2.log&
        # logProcess=$!
        # time vagrant winrm $vm -c "C:\vagrant\qa\phase2.bat"
        # kill -9 $logProcess
      else
        time vagrant ssh $vm -c "sudo /vagrant/qa/upgrade.sh"  -- -T
      fi
      echo -e "\n-- `date` ------------------- Provisioning phase3 completed for $vm ${BUILD}"
      sleep 30

  ;;
esac

echo "All VMS completed successfully" >> completed.txt
