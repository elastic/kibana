/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import type { RuleExecutionMetricsSnapshot } from '../metrics/types';
import type { RuleExecutionPipelineResult } from '../execution_pipeline';

/**
 * Rule execution outcome written to `kibana.task.data.status`.
 */
export type TaskRunStatus = 'success' | 'warning' | 'failed' | 'timeout' | 'skipped';

/**
 * Counters that mean the run finished on incomplete input: rows or groups
 * were dropped to stay within a limit, so the rule evaluated less data than
 * matched its query.
 */
const DEGRADATION_COUNTERS: readonly string[] = [
  RULE_EXECUTION_COUNTERS.groupsDroppedByLimit,
  RULE_EXECUTION_COUNTERS.rowsDroppedByLimit,
];

const isDegraded = (metrics: RuleExecutionMetricsSnapshot): boolean =>
  DEGRADATION_COUNTERS.some((counter) => (metrics.counters[counter] ?? 0) > 0);

/**
 * Status for a run that returned rather than threw.
 *
 * A halt is a deliberate early exit(no error was thrown) so no evaluation
 * happened and none failed: `skipped`.
 *
 * Runs that reach the end are `success`, downgraded to `warning`
 * when a limit truncated their input, since alerts derived from a truncated
 * result may be missing groups the rule never saw.
 */
export const resolveStatusForResult = (result: RuleExecutionPipelineResult): TaskRunStatus => {
  if (!result.completed) {
    return 'skipped';
  }

  return isDegraded(result.metrics) ? 'warning' : 'success';
};
