#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e

USER=${1:-'observer'}

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..

# Example: ./find_rules.sh
curl -v -k \
 -u $USER:changeme \
 -X GET "${KIBANA_URL}${SPACE_URL}/internal/rac/alerts/index" | jq .

# -X GET "${KIBANA_URL}${SPACE_URL}/internal/apm/settings/apm-alerts-as-data-indices" | jq .
