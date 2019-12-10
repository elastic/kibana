#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

FILTER=${1:-'alert.attributes.enabled:%20true'}

# Example: ./find_rule_by_filter.sh "alert.attributes.enabled:%20true"
# Example: ./find_rule_by_filter.sh "alert.attributes.name:%20Detect*"
# Example: ./find_rule_by_filter.sh "alert.attributes.tags:tag_1"
# The %20 is just an encoded space that is typical of URL's.
# Table of them for testing if needed: https://www.w3schools.com/tags/ref_urlencode.asp
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_find?filter=$FILTER | jq .
