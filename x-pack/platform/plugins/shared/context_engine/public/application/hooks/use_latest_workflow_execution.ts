/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  ExecutionStatusValues,
  ExecutionType,
  isTerminalStatus,
  type WorkflowExecutionListItemDto,
} from '@kbn/workflows';
import { useWorkflowsApi, type GetWorkflowExecutionsParams } from '@kbn/workflows-ui';

const RUNNING_REFETCH_MS = 3_000;
const IDLE_REFETCH_MS = 30_000;

const NON_TERMINAL_STATUSES = ExecutionStatusValues.filter((status) => !isTerminalStatus(status));

export const latestWorkflowExecutionQueryKey = (workflowId: string) =>
  ['context_engine', 'workflow_latest_execution', workflowId] as const;

export interface LatestWorkflowExecution {
  /** The most recent run; `null` when the workflow never ran, `undefined` until loaded. */
  execution: WorkflowExecutionListItemDto | null | undefined;
  /** A run is in progress, or the one just started has not been observed yet. */
  isRunning: boolean;
  activeExecutionId: string | undefined;
  isError: boolean;
  isLoading: boolean;
}

interface LatestWorkflowExecutionData {
  execution: WorkflowExecutionListItemDto | null;
  activeExecution: WorkflowExecutionListItemDto | null;
}

/**
 * The most recent run of a workflow, kept current while one is in progress.
 * `awaitedExecutionId` keeps the row running until that execution is observed.
 */
export const useLatestWorkflowExecution = (
  workflowId: string,
  { enabled = true, awaitedExecutionId }: { enabled?: boolean; awaitedExecutionId?: string } = {}
): LatestWorkflowExecution => {
  const api = useWorkflowsApi();
  const isAwaiting = (execution: WorkflowExecutionListItemDto | null | undefined) =>
    awaitedExecutionId !== undefined && execution?.id !== awaitedExecutionId;

  const { data, isLoading, isError } = useQuery({
    queryKey: latestWorkflowExecutionQueryKey(workflowId),
    queryFn: async (): Promise<LatestWorkflowExecutionData> => {
      const production: GetWorkflowExecutionsParams = {
        executionTypes: [ExecutionType.PRODUCTION],
        sortField: 'createdAt',
        sortOrder: 'desc',
        size: 1,
        omitStepRuns: true,
      };
      const [latest, active] = await Promise.all([
        api.getWorkflowExecutions(workflowId, production),
        api.getWorkflowExecutions(workflowId, { ...production, statuses: NON_TERMINAL_STATUSES }),
      ]);
      return {
        execution: latest.results[0] ?? null,
        activeExecution: active.results[0] ?? null,
      };
    },
    enabled,
    refetchInterval: (current) =>
      current?.activeExecution || isAwaiting(current?.execution)
        ? RUNNING_REFETCH_MS
        : IDLE_REFETCH_MS,
  });

  const activeExecutionId = data?.activeExecution?.id;
  const isRunning = enabled && (activeExecutionId !== undefined || isAwaiting(data?.execution));

  return {
    execution: data?.execution,
    isRunning,
    activeExecutionId,
    isError,
    isLoading: enabled && isLoading,
  };
};
