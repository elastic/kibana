/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries } from '@kbn/react-query';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import {
  IDLE_REFETCH_MS,
  fetchLatestWorkflowExecution,
  latestWorkflowExecutionQueryKey,
} from './use_latest_workflow_execution';

const FAILED_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.FAILED,
  ExecutionStatus.TIMED_OUT,
]);

export interface FailedAutomationRun {
  workflowId: string;
  execution: WorkflowExecutionListItemDto;
}

/**
 * The automations whose latest run failed or timed out, in the order of `workflowIds`.
 * Shares the query cache with `useLatestWorkflowExecution`, so the automation rows and
 * this list always show the same run.
 */
export const useFailedAutomationRuns = (
  workflowIds: readonly string[],
  { enabled = true }: { enabled?: boolean } = {}
): FailedAutomationRun[] => {
  const api = useWorkflowsApi();
  // An AI index can list the same workflow twice; one failed run must count once.
  const uniqueWorkflowIds = [...new Set(workflowIds)];
  const results = useQueries({
    queries: uniqueWorkflowIds.map((workflowId) => ({
      queryKey: latestWorkflowExecutionQueryKey(workflowId),
      queryFn: () => fetchLatestWorkflowExecution(api, workflowId),
      enabled,
      refetchInterval: IDLE_REFETCH_MS,
    })),
  });

  return uniqueWorkflowIds.flatMap((workflowId, index) => {
    const result = results[index];
    // A failed refresh keeps the old data. Like the automation row, don't show it as current.
    if (result?.isError) {
      return [];
    }
    const execution = result?.data?.execution;
    return execution && FAILED_STATUSES.has(execution.status) ? [{ workflowId, execution }] : [];
  });
};
