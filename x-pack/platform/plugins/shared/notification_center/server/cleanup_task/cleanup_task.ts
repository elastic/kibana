/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskCost } from '@kbn/task-manager-plugin/server';

export const CLEANUP_TASK_TYPE = 'notification-center:cleanup';
export const CLEANUP_TASK_ID = 'notification-center:cleanup';

export const CLEANUP_TASK_TITLE = 'Notification Center retention cleanup';

/** First run may scan up to 180d of data; 10m gives headroom without tying up TM slots. */
export const CLEANUP_TASK_TIMEOUT = '10m';

/** Composite aggregation plus batched deletion is a normal-cost ES workload. */
export const CLEANUP_TASK_COST = TaskCost.Normal;

export const CLEANUP_TASK_SCHEDULE = { interval: '1d' } as const;
