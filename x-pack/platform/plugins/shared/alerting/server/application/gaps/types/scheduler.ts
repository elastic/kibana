/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { rawGapAutoFillSchedulerSchemaV1 } from '../../../saved_objects/schemas/raw_gap_auto_fill_scheduler';
export type SchedulerSoAttributes = TypeOf<typeof rawGapAutoFillSchedulerSchemaV1>;

export const GAP_AUTO_FILL_SCHEDULER_TASK_TYPE = 'gap-auto-fill-scheduler-task' as const;

export const DEFAULT_RULES_BATCH_SIZE = 100;
export const DEFAULT_GAPS_PER_PAGE = 5000;

export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT = '60s' as const;

export type GapAutoFillSchedulerLogConfig = Pick<
  SchedulerSoAttributes,
  'name' | 'numRetries' | 'gapFillRange' | 'schedule' | 'maxBackfills' | 'ruleTypes'
>;
