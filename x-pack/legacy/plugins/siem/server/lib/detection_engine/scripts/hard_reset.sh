#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

./delete_all_actions.sh
./delete_all_alerts.sh
./delete_all_alert_tasks.sh
./delete_all_statuses.sh
./delete_signal_index.sh
./post_signal_index.sh
