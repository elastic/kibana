#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

# Add this to the start of any scripts to detect if env variables are set

set -e 

if [ -z "${ELASTICSEARCH_USERNAME}" ]; then
  echo "Set ELASTICSEARCH_USERNAME in your enviornment"
  exit 1
fi

if [ -z "${ELASTICSEARCH_PASSWORD}" ]; then
  echo "Set ELASTICSEARCH_PASSWORD in your enviornment"
  exit 1
fi

if [ -z "${ELASTICSEARCH_URL}" ]; then
  echo "Set ELASTICSEARCH_URL in your enviornment"
  exit 1
fi

if [ -z "${KIBANA_URL}" ]; then
  echo "Set KIBANA_URL in your enviornment"
  exit 1
fi

if [ -z "${SIGNALS_INDEX}" ]; then
  echo "Set SIGNALS_INDEX in your enviornment"
  exit 1
fi

if [ -z "${TASK_MANAGER_INDEX}" ]; then
  echo "Set TASK_MANAGER_INDEX in your enviornment"
  exit 1
fi

if [ -z "${KIBANA_INDEX}" ]; then
  echo "Set KIBANA_INDEX in your enviornment"
  exit 1
fi
