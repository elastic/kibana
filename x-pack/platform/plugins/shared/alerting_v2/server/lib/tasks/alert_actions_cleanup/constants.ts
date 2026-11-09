/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_ACTIONS_CLEANUP_TASK_TYPE = 'alerting_v2:alert_actions_cleanup' as const;
export const ALERT_ACTIONS_CLEANUP_TASK_ID = 'alerting_v2:alert_actions_cleanup:1.0.0' as const;
export const ALERT_ACTIONS_CLEANUP_TASK_INTERVAL = '1d';
export const ALERT_ACTIONS_CLEANUP_TASK_TIMEOUT = '5m';

export const DISPATCHER_ACTION_TYPES = ['fire', 'suppress', 'unmatched'];
