/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TaskManagerUsage {
  task_type_exclusion: string[];
  failed_tasks: number;
  recurring_tasks: {
    actual_service_time: number;
    adjusted_service_time: number;
  };
  adhoc_tasks: {
    actual_service_time: number;
    adjusted_service_time: number;
  };
  capacity: number;
  configured_capacity: number;
  total_task_runs_24hr: number;
  task_runs_by_type_24hr: Array<{ name: string; value: number }>;
  task_runs_other_24hr: number;
  schedule_delay_ms_24hr: {
    p50: number | null;
    p75: number | null;
    p95: number | null;
    p99: number | null;
  };
}
