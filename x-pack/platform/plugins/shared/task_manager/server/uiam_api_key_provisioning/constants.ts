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
export const SCHEDULE_INTERVAL: IntervalSchedule = { interval: '1d' };
export const TASK_TIMEOUT = '5m';

/**
 * Lower bound for `task.runAt` in the UIAM provisioning fetch query (Elasticsearch date math).
 * Keeps eligible tasks from being claimed for execution imminently; evaluated as `now` on the cluster.
 */
export const UIAM_PROVISIONING_FETCH_RUN_AT_GT = 'now+30s';
/** When there are more tasks to convert, run again after this many ms (10m) to process the next batch. */
export const RUN_AT_INTERVAL_MS = 600_000;

/** Max number of task docs to fetch per run (same as referenced alerting provisioning task). */
export const FETCH_BATCH_SIZE = 500;
/**
 * Page size when listing final UIAM provisioning status SOs (matches Alerting `GET_STATUS_BATCH_SIZE`).
 */
export const GET_STATUS_BATCH_SIZE = 500;

/**
 * UIAM convert error code returned when the Elasticsearch API key creator is not a Cloud user.
 * Source: https://github.com/elastic/uiam/blob/main/modules/domain/src/main/java/co/elastic/cloud/uiam/domain/errors/ErrorCode.java
 */
export const NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE = '0x357391';

export const TAGS = ['serverless', 'task-manager', 'uiam-api-key-provisioning', 'background-task'];
