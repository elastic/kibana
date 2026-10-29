/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ExecutionType, isTerminalStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';

/** Polled this often while a run is in progress, so the row shows it finish. */
const RUNNING_REFETCH_MS = 3_000;
/** And this often otherwise, so a scheduled run shows up without a reload. */
const IDLE_REFETCH_MS = 30_000;

export const latestWorkflowExecutionQueryKey = (workflowId: string) =>
  ['context_engine', 'workflow_latest_execution', workflowId] as const;

export interface LatestWorkflowExecution {
  /** The most recent run, test runs excluded; `null` when the workflow never ran. */
  execution: WorkflowExecutionListItemDto | null | undefined;
  isRunning: boolean;
  isLoading: boolean;
}

/** The most recent run of a workflow, kept current while it runs. */
export const useLatestWorkflowExecution = (
  workflowId: string,
  { enabled = true }: { enabled?: boolean } = {}
): LatestWorkflowExecution => {
  const api = useWorkflowsApi();
  const { data, isLoading } = useQuery({
    queryKey: latestWorkflowExecutionQueryKey(workflowId),
    queryFn: async () => {
      const { results } = await api.getWorkflowExecutions(workflowId, {
        executionTypes: [ExecutionType.PRODUCTION],
        sortField: 'createdAt',
        sortOrder: 'desc',
        size: 1,
        omitStepRuns: true,
      });
      return results[0] ?? null;
    },
    enabled,
    refetchInterval: (latest) =>
      latest && !isTerminalStatus(latest.status) ? RUNNING_REFETCH_MS : IDLE_REFETCH_MS,
  });

  return {
    execution: data,
    isRunning: data != null && !isTerminalStatus(data.status),
    isLoading: enabled && isLoading,
  };
};
