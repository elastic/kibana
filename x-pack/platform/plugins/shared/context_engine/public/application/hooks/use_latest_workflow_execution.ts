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
 * `awaitedExecutionIds` keeps running until every listed id appears on some workflow query.
 * `onAwaitedObserved` fires once all awaited ids are seen (keyed by joined ids).
 */
export const useLatestWorkflowExecution = (
  workflowIds: readonly string[],
  {
    enabled = true,
    awaitedExecutionIds,
    onAwaitedObserved,
  }: {
    enabled?: boolean;
    awaitedExecutionIds?: readonly string[];
    onAwaitedObserved?: () => void;
  } = {}
): LatestWorkflowExecution => {
  const api = useWorkflowsApi();
  const queriesEnabled = enabled && workflowIds.length > 0;

  const awaitingObservedRef = useRef(false);
  const onAwaitedObservedRef = useRef(onAwaitedObserved);
  onAwaitedObservedRef.current = onAwaitedObserved;

  const awaitedIds = awaitedExecutionIds ?? [];
  const hasAwaited = awaitedIds.length > 0;

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
        current?.activeExecution || (hasAwaited && !awaitingObservedRef.current)
          ? RUNNING_REFETCH_MS
          : IDLE_REFETCH_MS,
    })),
  });

  const awaitedObserved =
    hasAwaited &&
    awaitedIds.every((awaitedId) =>
      queries.some(
        ({ data }) => data?.execution?.id === awaitedId || data?.activeExecution?.id === awaitedId
      )
    );
  awaitingObservedRef.current = !hasAwaited || awaitedObserved;

  const awaitedKey = awaitedIds.join(',');

  useEffect(() => {
    if (awaitedObserved) {
      onAwaitedObservedRef.current?.();
    }
  }, [awaitedObserved, awaitedKey]);

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

  const index = queries.findIndex(
    (query) => !query.isError && (query.data === undefined || query.data.execution !== null)
  );

  let execution: WorkflowExecutionListItemDto | null | undefined;
  if (index === -1) {
    execution = queries.some((query) => query.isError) ? undefined : null;
  } else {
    execution = queries[index]?.data?.execution ?? undefined;
  }

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
