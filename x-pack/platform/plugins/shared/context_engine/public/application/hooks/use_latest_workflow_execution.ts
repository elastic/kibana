/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries } from '@kbn/react-query';
import { useEffect, useRef } from 'react';
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
  /** Latest run of the first workflow in `workflowIds` that has one; `null` if none; `undefined` while loading. */
  execution: WorkflowExecutionListItemDto | null | undefined;
  /** Workflow id of the displayed execution, for execution links. */
  workflowId: string | undefined;
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

const productionExecutionsParams: GetWorkflowExecutionsParams = {
  executionTypes: [ExecutionType.PRODUCTION],
  sortField: 'createdAt',
  sortOrder: 'desc',
  size: 1,
  omitStepRuns: true,
};

/**
 * Latest runs for workflows in list order. The first workflow with a run is shown.
 * `awaitedExecutionId` keeps running until that id appears on any listed workflow.
 * `onAwaitedObserved` fires when that id is seen in query results.
 */
export const useLatestWorkflowExecution = (
  workflowIds: readonly string[],
  {
    enabled = true,
    awaitedExecutionId,
    onAwaitedObserved,
  }: {
    enabled?: boolean;
    awaitedExecutionId?: string;
    onAwaitedObserved?: () => void;
  } = {}
): LatestWorkflowExecution => {
  const api = useWorkflowsApi();
  const queriesEnabled = enabled && workflowIds.length > 0;

  const awaitingObservedRef = useRef(false);
  const onAwaitedObservedRef = useRef(onAwaitedObserved);
  onAwaitedObservedRef.current = onAwaitedObserved;

  const queries = useQueries({
    queries: workflowIds.map((workflowId) => ({
      queryKey: latestWorkflowExecutionQueryKey(workflowId),
      queryFn: async (): Promise<LatestWorkflowExecutionData> => {
        const [latest, active] = await Promise.all([
          api.getWorkflowExecutions(workflowId, productionExecutionsParams),
          api.getWorkflowExecutions(workflowId, {
            ...productionExecutionsParams,
            statuses: NON_TERMINAL_STATUSES,
          }),
        ]);
        return {
          execution: latest.results[0] ?? null,
          activeExecution: active.results[0] ?? null,
        };
      },
      enabled: queriesEnabled,
      refetchInterval: (current: LatestWorkflowExecutionData | undefined) =>
        current?.activeExecution ||
        (awaitedExecutionId !== undefined && !awaitingObservedRef.current)
          ? RUNNING_REFETCH_MS
          : IDLE_REFETCH_MS,
    })),
  });

  const awaitedObserved =
    awaitedExecutionId !== undefined &&
    queries.some(
      ({ data }) =>
        data?.execution?.id === awaitedExecutionId ||
        data?.activeExecution?.id === awaitedExecutionId
    );
  awaitingObservedRef.current = awaitedExecutionId === undefined || awaitedObserved;

  useEffect(() => {
    if (awaitedObserved) {
      onAwaitedObservedRef.current?.();
    }
  }, [awaitedObserved, awaitedExecutionId]);

  if (!queriesEnabled) {
    return {
      execution: undefined,
      workflowId: undefined,
      isRunning: false,
      activeExecutionId: undefined,
      isError: false,
      isLoading: false,
    };
  }

  const index = queries.findIndex(({ data }) => data === undefined || data.execution !== null);
  const execution = index === -1 ? null : queries[index]?.data?.execution ?? undefined;
  const activeExecutionId = queries.find(({ data }) => data?.activeExecution)?.data?.activeExecution
    ?.id;

  return {
    execution,
    workflowId: execution ? workflowIds[index] : undefined,
    isRunning: activeExecutionId !== undefined || !awaitingObservedRef.current,
    activeExecutionId,
    isError: queries.some(({ isError }) => isError),
    isLoading: queries.some(({ isLoading }) => isLoading),
  };
};
