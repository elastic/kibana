/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule } from '../task';
export declare const TASK_ID = 'task_manager_snapshot_telemetry';
export declare const TASK_TYPE = 'task_manager:snapshot_telemetry';
export declare const SCHEDULE: IntervalSchedule;
export declare const TASK_TIMEOUT = '5m';
export declare const EVENT_LOG_INDEX = '.kibana-event-log-*';
export declare const MAX_TASK_TYPE_BUCKETS = 100;
export declare const TELEMETRY_WINDOW = 'now-24h';
