/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule } from '@kbn/task-manager-plugin/server';

export const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
export const API_KEY_PROVISIONING_TASK_ID = 'api_key_provisioning';
export const API_KEY_PROVISIONING_TASK_TYPE = `alerting:${API_KEY_PROVISIONING_TASK_ID}`;
export const API_KEY_PROVISIONING_TASK_SCHEDULE: IntervalSchedule = { interval: '1d' };
export const TASK_TIMEOUT = '5m';
/** Delay before the next run when more batches are pending (10 minutes) */
export const RESCHEDULE_DELAY_MS = 600000;
export const TAGS = ['serverless', 'alerting', 'uiam-api-key-provisioning', 'background-task'];

export const GET_RULES_BATCH_SIZE = 300;
export const GET_STATUS_BATCH_SIZE = 500;
export const NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE = '0x357391';
/**
 * Max number of rule IDs per KQL `or` clause when building the exclude filter.
 * Keeps each bool.should below Elasticsearch's indices.query.bool.max_clause_count (default 4096).
 */
export const EXCLUDE_FILTER_CLAUSE_BATCH_SIZE = 1024;
