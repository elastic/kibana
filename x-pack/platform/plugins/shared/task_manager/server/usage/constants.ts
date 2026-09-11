/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule } from '../task';

export const TASK_ID = 'snapshot_telemetry';
export const TASK_TYPE = `task_manager:${TASK_ID}`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };
export const TASK_TIMEOUT = '5m';

// The event log is queried directly rather than through @kbn/event-log-plugin: Task Manager
// cannot depend on it without introducing a circular dependency, which is also why the task
// event logger is injected by the task_manager_dependencies plugin instead.
export const EVENT_LOG_INDEX = '.kibana-event-log-*';

// Kibana registers a large number of task types across platform and solutions, so the
// by-type breakdown is capped to keep the telemetry payload bounded.
export const MAX_TASK_TYPE_BUCKETS = 100;

export const TELEMETRY_WINDOW = 'now-24h';
