#!/bin/bash
echo -e "\n-- `date` Starting get_builds"

# Note that 6.x build sha512 files have the sha followed by the filename like;
# cat qa/elasticsearch-6.0.0-rc2-SNAPSHOT.tar.gz.sha512
# ce5ef346e33027cad8afab81d46092d6cc4400603f2dbaceeb5da2b4ef1ea34e1579a4bdbcf1614bb45961516c94a620e2d7402585c462ceee2eff13660d0f37  elasticsearch-6.0.0-rc2-SNAPSHOT.tar.gz
# But 5.x builds only have the sha512
# This script should work for both.


set +e
# cd to the qa/ dir where this script lives
cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=$PWD

date
if [ -z "${VERSION}" ]; then . ./envvars.sh; fi

COMMON=${OSS}-${VERSION}${SNAPSHOT}${PLATFORM}.${PACKAGE}
echo "COMMON=$COMMON"

OS=linux
if [[ $VMOS == windows ]]; then
  OS=windows
else
  OS=linux
fi

PLUGIN_COMMON=-${VERSION}${SNAPSHOT}-${OS}.zip
echo "PLUGIN_COMMON=$PLUGIN_COMMON"

ls ../downloads || mkdir ../downloads
pushd ../downloads

function download512 () {

  URL=$1
  FILENAME=${URL##*/}

  # delete any existing sha512 file
  if [ -f $FILENAME ]; then
      rm -f $FILENAME
  fi
  wget -q --no-check-certificate $URL
}


function download () {

  URL=$1
  FILENAME=${URL##*/}
  XP=$2

  # first check if we have a matching filename
  if [ -f ${XP}${FILENAME} ]; then
    # if we already have a file, check to see if it matches the hash
    if [ `sha512sum ${XP}${FILENAME} | cut -f1 -d' '` != `cat ${XP}${FILENAME}.sha512| cut -f1 -d' '` ]; then
      # if it doesn't match, delete the non-matching and wget it fresh
      rm -f ${XP}${FILENAME}


      while [ 1 ]; do
          wget -q --retry-connrefused --waitretry=1 --read-timeout=20 --timeout=15 -t 0 --continue --no-check-certificate --tries=3 $URL
          if [ $? = 0 ]; then break; fi; # check return value, break if successful (0)
          sleep 1s;
      done;


      # wget --no-check-certificate $URL
    fi
  else
    # we didn't have a matching filename, so get it


    while [ 1 ]; do
        wget -q --retry-connrefused --waitretry=1 --read-timeout=20 --timeout=15 -t 0 --continue --no-check-certificate --tries=3 $URL
        if [ $? = 0 ]; then break; fi; # check return value, break if successful (0)
        sleep 1s;
    done;



    # wget --no-check-certificate $URL
    if [ "$XP" != "" ]; then
      mv $FILENAME ${XP}${FILENAME}
    fi
  fi
}

echo "-------------------ESHOST = ${ESHOST}"

# First just download the checksums, then we can check if we already have that one or need to download it
echo -e "\n-- `date` Download the checksums for each required artifact"

# If we're running on localhost get this VM set up to
# install kibana and elasticsearch, otherwise we're running against a cloud instance
# which we assume is already configured and running.
if [ "${ESHOST}" = "localhost" ]; then
  download512 `grep "\"url.*kibana${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
  download512 `grep "\"url.*elasticsearch${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
  download512 `grep "\"url.*apm-server${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
  if [ "${XPACK}" = "YES" ]; then
    download512 `grep "\"url.*java-langserver${PLUGIN_COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
  fi
fi

if [[ $PRODUCTS =~ .*logstash.* ]]; then
  download512 `grep "\"url.*logstash${OSS}-${VERSION}${SNAPSHOT}.${PACKAGE}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
fi

for beat in $BEATS; do (
  download512 `grep "\"url.*${beat}${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`.sha512
); done


############################## Now make sure we have files that match the sha512's from above ################################
echo -e "\n-- `date` Download the artifacts (in parallel in the background)"

if [ "${ESHOST}" = "localhost" ]; then
  download `grep "\"url.*kibana${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
  download `grep "\"url.*elasticsearch${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
fi

if [[ $PRODUCTS =~ .*apm-server.* ]]; then
  download `grep "\"url.*apm-server${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
fi

if [ "${XPACK}" = "YES" ]; then
    download `grep "\"url.*java-langserver${PLUGIN_COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
fi

if [[ $PRODUCTS =~ .*logstash.* ]]; then
  download `grep "\"url.*logstash${OSS}-${VERSION}${SNAPSHOT}.${PACKAGE}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
fi

for beat in $BEATS; do
  download `grep "\"url.*${beat}${COMMON}" ${QADIR}/../manifest-${VERSION}${SNAPSHOT}.json  | cut -d\" -f4`
done

echo -e "\n-- `date` Wait for all packages to download"
#####################################################################
wait


pwd
ls -l *${VERSION}*
echo -e "\n-- `date` Now check all the checksums and fail if any don't match"

if [ "${ESHOST}" = "localhost" ]; then
  if [ `sha512sum kibana${COMMON} | cut -f1 -d' '` != `cat kibana${COMMON}.sha512 | cut -f1 -d' '` ]; then
    echo "We failed to match the sha512 for kibana${COMMON}"
    exit 1
  fi

  if [ `sha512sum elasticsearch${COMMON} | cut -f1 -d' '` != `cat elasticsearch${COMMON}.sha512| cut -f1 -d' '` ]; then
    echo "We failed to match the sha512 for elasticsearch${COMMON}"
    exit 1
  fi

  if [[ $PRODUCTS =~ .*apm-server.* ]]; then
    if [ `sha512sum apm-server${COMMON} | cut -f1 -d' '` != `cat apm-server${COMMON}.sha512| cut -f1 -d' '` ]; then
      echo "We failed to match the sha512 for apm-server${COMMON}"
      exit 1
    fi
  fi

  if [ "${XPACK}" = "YES" ]; then
    if [ `sha512sum java-langserver${PLUGIN_COMMON} | cut -f1 -d' '` != `cat java-langserver${PLUGIN_COMMON}.sha512| cut -f1 -d' '` ]; then
        echo "We failed to match the sha512 for java-langserver${PLUGIN_COMMON}"
      exit 1
    fi
  fi
fi

if [[ $PRODUCTS =~ .*logstash.* ]]; then
  if [ `sha512sum logstash${OSS}-${VERSION}${SNAPSHOT}.${PACKAGE} | cut -f1 -d' '` != `cat logstash${OSS}-${VERSION}${SNAPSHOT}.${PACKAGE}.sha512| cut -f1 -d' '` ]; then
    echo "We failed to match the sha512 for logstash${OSS}-${VERSION}${SNAPSHOT}.${PACKAGE}"
    exit 1
  fi
fi

for beat in $BEATS; do
  if [ `sha512sum ${beat}${COMMON} | cut -f1 -d' '` != `cat ${beat}${COMMON}.sha512| cut -f1 -d' '` ]; then
    echo "We failed to match the sha512 for ${beat}${COMMON}"
    exit 1
  fi
done

popd
echo -e "\n-- `date` Finished get_builds"
