#!/bin/bash
if [ -z "$PACKAGE" ]; then . ./envvars.sh; fi
set -e

case $PACKAGE in
  deb|rpm)
    if [ "${ESHOST}" = "localhost" ]; then
      echo -e "\n-- `date` installing the kibana plugins."
      time sudo -u kibana ${INSTALL_DIR}/kibana/bin/kibana-plugin install file://${QADIR}/../downloads/java-langserver-${VERSION}${SNAPSHOT}-linux.zip
    fi
    ;;
  tar.gz)
    if [ "${ESHOST}" = "localhost" ]; then
      echo -e "\n-- `date` installing the kibana plugins."
      time sudo -u vagrant ${INSTALL_DIR}/kibana/bin/kibana-plugin install file://${QADIR}/../downloads/java-langserver-${VERSION}${SNAPSHOT}-linux.zip
    fi
    ;;
  zip)
  echo "install for Windows zip files"
    if [ "${ESHOST}" = "localhost" ]; then
      echo -e "\n-- `date` installing the kibana plugins."
      time ${INSTALL_DIR}/kibana/bin/kibana-plugin${DOTBAT} install file:///`cygpath -m ${QADIR}/../downloads/java-langserver-${VERSION}${SNAPSHOT}-windows.zip`
    fi
    ;;
esac
