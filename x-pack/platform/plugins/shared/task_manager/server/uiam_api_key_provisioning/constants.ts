/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule } from '../task';

export const PROVISION_UIAM_API_KEYS_FLAG = 'taskManager.provisionUiamApiKeys';

export const TASK_ID = 'uiam_api_key_provisioning';
export const TASK_TYPE = `task_manager:${TASK_ID}`;

export const UIAM_PROVISIONING_TASK_TITLE = 'UIAM API key provisioning for task manager tasks';
export const SCHEDULE_INTERVAL: IntervalSchedule = { interval: '1h' };
export const TASK_TIMEOUT = '5m';

export const RUN_AT_BUFFER_MS = 30_000;
/** When there are more tasks to convert, run again after this many ms (1m) to process the next batch. */
export const RUN_AT_INTERVAL_MS = 60_000;

/** Max number of task docs to fetch per run (same as referenced alerting provisioning task). */
export const FETCH_BATCH_SIZE = 500;

export const TAGS = ['task-manager', 'uiam-api-key-provisioning', 'background-task'];
