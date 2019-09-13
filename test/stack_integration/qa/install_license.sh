#!/bin/bash

# if license is not TRIAL, install the new license
if [ "$XPACK"="YES" ] && [ ! "$LICENSE" = "TRIAL" ]; then
  if [ "$SNAPSHOT" = "-SNAPSHOT" ]; then
    TYPE=dev
  else
    TYPE=rel
  fi

pushd ../license

  case $LICENSE in
    # BASIC)
    #   curl -XPUT -k -u ${ELASTICUSER}:${ELASTICPWD} "${ESPROTO}://${ESHOST}:${ESPORT}/_xpack/license?acknowledge=true" -H 'Content-Type: application/json' -d @license_${TYPE}_basic.json > /tmp/tempcurl 2>&1
    #   cat /tmp/tempcurl
    # ;;
    GOLD)
      curl -XPUT -k -u ${ELASTICUSER}:${ELASTICPWD} "${ESPROTO}://${ESHOST}:${ESPORT}/_xpack/license?acknowledge=true" -H 'Content-Type: application/json' -d @license_${TYPE}_gold.json > /tmp/tempcurl 2>&1
      cat /tmp/tempcurl
    ;;
    PLATINUM)
      curl -XPUT -k -u ${ELASTICUSER}:${ELASTICPWD} "${ESPROTO}://${ESHOST}:${ESPORT}/_xpack/license?acknowledge=true" -H 'Content-Type: application/json' -d @license_${TYPE}_platinum.json > /tmp/tempcurl 2>&1
      cat /tmp/tempcurl
    ;;
  esac

popd

fi
