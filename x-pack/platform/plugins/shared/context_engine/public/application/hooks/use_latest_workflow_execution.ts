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

export interface WorkflowLatestExecution {
  workflowId: string;
  execution: WorkflowExecutionListItemDto;
}

export interface LatestWorkflowExecution {
  /** Latest run per workflow that has one, in `workflowIds` order; `undefined` while loading or when no query succeeded with data. */
  executions: readonly WorkflowLatestExecution[] | undefined;
  /** Workflows whose history lookup failed and has no cached result. */
  unavailableWorkflowIds: readonly string[];
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

/** Latest production runs for the given workflow ids, with optional await until listed execution ids appear. */
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

  const awaitSettledRef = useRef(false);
  const onAwaitedObservedRef = useRef(onAwaitedObserved);
  onAwaitedObservedRef.current = onAwaitedObserved;

  const awaitedIds = awaitedExecutionIds ?? [];
  const hasAwaited = awaitedIds.length > 0;
  const awaitedKey = awaitedIds.join(',');

  const observedAwaitedIdsRef = useRef<Set<string>>(new Set());
  const lastAwaitedKeyRef = useRef(awaitedKey);

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
        current?.activeExecution || (hasAwaited && !awaitSettledRef.current)
          ? RUNNING_REFETCH_MS
          : IDLE_REFETCH_MS,
    })),
  });

  if (lastAwaitedKeyRef.current !== awaitedKey) {
    observedAwaitedIdsRef.current = new Set();
    lastAwaitedKeyRef.current = awaitedKey;
  }

  const observedAwaitedIds = observedAwaitedIdsRef.current;
  for (const { data } of queries) {
    for (const id of [data?.execution?.id, data?.activeExecution?.id]) {
      if (id !== undefined && awaitedIds.includes(id)) {
        observedAwaitedIds.add(id);
      }
    }
  }

  const awaitedObserved =
    hasAwaited && awaitedIds.every((awaitedId) => observedAwaitedIds.has(awaitedId));
  awaitSettledRef.current = !hasAwaited || awaitedObserved;

  useEffect(() => {
    if (awaitedObserved) {
      onAwaitedObservedRef.current?.();
    }
  }, [awaitedObserved, awaitedKey]);

  if (!queriesEnabled) {
    return {
      executions: undefined,
      unavailableWorkflowIds: [],
      isRunning: false,
      activeExecutionId: undefined,
      isError: false,
      isLoading: false,
    };
  }

  const hasPending = queries.some((query) => !query.isError && query.data === undefined);
  const isError = queries.some((query) => query.isError);

  let executions: readonly WorkflowLatestExecution[] | undefined;

  if (hasPending) {
    executions = undefined;
  } else {
    const built = queries.flatMap(({ data }, index) => {
      if (data === undefined) {
        return [];
      }
      const run = data.execution;
      return run !== null ? [{ workflowId: workflowIds[index], execution: run }] : [];
    });
    if (isError && built.length === 0) {
      executions = undefined;
    } else {
      executions = built;
    }
  }

  const activeExecutionId = queries
    .map(({ data }) => data?.activeExecution?.id)
    .find((id) => id !== undefined);

  const unavailableWorkflowIds = workflowIds.filter((_, index) => {
    const query = queries[index];
    return query.isError && query.data === undefined;
  });

  return {
    executions,
    unavailableWorkflowIds,
    isRunning: activeExecutionId !== undefined || !awaitSettledRef.current,
    activeExecutionId,
    isError,
    isLoading: queries.some(({ isLoading }) => isLoading),
  };
};
