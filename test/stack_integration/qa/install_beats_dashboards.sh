#!/bin/bash
echo -e "\n-- `date` Load Beats index patterns, saves searches, visualizations, and dashboards"
if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi


for beat in $BEATS; do (
  pushd ${INSTALL_DIR}/${beat}/scripts/
  ./import_dashboards -user $ELASTICUSER -pass $ELASTICPWD -es ${ESURL} -url http://${BASEURL}/downloads/beats/beats-dashboards/beats-dashboards-${VERSION}${SNAPSHOT}.zip
  popd

); done
