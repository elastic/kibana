/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { minBy } from 'lodash';
import { ExecutionStatus, type ExecutionStatusUnion } from '@kbn/workflows';
import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';

// Lower is worse.
const STATUS_RANK: Readonly<Record<ExecutionStatusUnion, number>> = {
  [ExecutionStatus.FAILED]: 0,
  [ExecutionStatus.TIMED_OUT]: 0,
  [ExecutionStatus.CANCELLED]: 1,
  [ExecutionStatus.SKIPPED]: 2,
  [ExecutionStatus.PENDING]: 3,
  [ExecutionStatus.WAITING]: 3,
  [ExecutionStatus.WAITING_FOR_INPUT]: 3,
  [ExecutionStatus.WAITING_FOR_CHILD]: 3,
  [ExecutionStatus.RUNNING]: 3,
  [ExecutionStatus.QUEUED]: 3,
  [ExecutionStatus.COMPLETED]: 4,
};

/** Execution with the most severe status; first one wins on ties. */
export const getWorstExecution = (
  executions: readonly WorkflowLatestExecution[]
): WorkflowLatestExecution | undefined =>
  minBy(executions, ({ execution }) => STATUS_RANK[execution.status]);
