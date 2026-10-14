/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatestTaskStateSchema } from '../task_state';

export interface TermsBucket {
  key: string;
  doc_count: number;
}

export interface EventLogStatsAggregations {
  by_task_type: { buckets: TermsBucket[]; sum_other_doc_count: number };
  delay_percentiles: { values: Record<string, number | null> };
}

export type EventLogStatsResults = Pick<
  LatestTaskStateSchema,
  | 'total_task_runs_24hr'
  | 'task_runs_by_type_24hr'
  | 'task_runs_other_24hr'
  | 'schedule_delay_ms_24hr'
>;
