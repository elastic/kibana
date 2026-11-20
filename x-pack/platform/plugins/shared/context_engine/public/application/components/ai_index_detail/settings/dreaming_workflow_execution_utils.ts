/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';
import { getWorkflowExecutionStatusWorstRank } from '../workflow_last_execution';

const executionStartedAt = (startedAt: string | undefined): string => startedAt ?? '';

export const getWorstExecutionStatus = (
  executions: readonly WorkflowLatestExecution[]
): WorkflowLatestExecution | undefined => {
  let worst: WorkflowLatestExecution | undefined;
  let worstRank = Number.POSITIVE_INFINITY;
  let worstStartedAt = '';

  for (const item of executions) {
    const { status, startedAt } = item.execution;
    const rank = getWorkflowExecutionStatusWorstRank(status);
    const started = executionStartedAt(startedAt);
    const isWorse =
      rank < worstRank || (rank === worstRank && started.localeCompare(worstStartedAt) > 0);
    if (isWorse) {
      worstRank = rank;
      worstStartedAt = started;
      worst = item;
    }
  }

  return worst;
};
