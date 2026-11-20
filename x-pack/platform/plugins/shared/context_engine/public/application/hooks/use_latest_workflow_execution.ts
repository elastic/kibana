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
  /** Newest run across workflows (by `startedAt`, else `createdAt`); `null` if none; `undefined` while loading. */
  execution: WorkflowExecutionListItemDto | null | undefined;
  /** Workflow id of `execution`, for execution links. */
  workflowId: string | undefined;
  /** Latest run per workflow that has one, in `workflowIds` order. */
  executions: readonly WorkflowLatestExecution[];
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

// `startedAt` is typed as required but is absent for executions that have not started yet.
const readOptionalTimestamp = (
  execution: WorkflowExecutionListItemDto,
  key: 'startedAt' | 'createdAt'
): string | undefined => {
  if (!Object.hasOwn(execution, key)) {
    return undefined;
  }
  const value = Reflect.get(execution, key);
  return typeof value === 'string' ? value : undefined;
};

const parseTimestamp = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const executionCompareTime = (execution: WorkflowExecutionListItemDto): number =>
  parseTimestamp(readOptionalTimestamp(execution, 'startedAt')) ??
  parseTimestamp(readOptionalTimestamp(execution, 'createdAt')) ??
  Number.NEGATIVE_INFINITY;

const pickNewestExecution = (
  items: readonly WorkflowLatestExecution[]
): WorkflowLatestExecution | undefined => {
  let best: WorkflowLatestExecution | undefined;
  let bestTime = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const time = executionCompareTime(item.execution);
    if (best === undefined || time > bestTime) {
      best = item;
      bestTime = time;
    }
  }

  return best;
};

/**
 * Latest runs for workflows in list order. `execution` is the newest across workflows.
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
      executions: [],
      isRunning: false,
      activeExecutionId: undefined,
      isError: false,
      isLoading: false,
    };
  }

  const hasPending = queries.some((query) => !query.isError && query.data === undefined);
  const isError = queries.some((query) => query.isError);

  const executions: WorkflowLatestExecution[] = [];
  if (!hasPending) {
    for (let i = 0; i < workflowIds.length; i++) {
      const query = queries[i];
      if (query === undefined || query.isError || query.data === undefined) {
        continue;
      }
      const run = query.data.execution;
      if (run !== null) {
        executions.push({ workflowId: workflowIds[i], execution: run });
      }
    }
  }

  let execution: WorkflowExecutionListItemDto | null | undefined;
  let workflowId: string | undefined;
  const newest = hasPending ? undefined : pickNewestExecution(executions);

  if (hasPending) {
    execution = undefined;
    workflowId = undefined;
  } else if (newest !== undefined) {
    execution = newest.execution;
    workflowId = newest.workflowId;
  } else if (isError) {
    execution = undefined;
    workflowId = undefined;
  } else {
    execution = null;
    workflowId = undefined;
  }

  const activeExecutionId = queries.find(({ data }) => data?.activeExecution)?.data?.activeExecution
    ?.id;

  return {
    execution,
    workflowId,
    executions: hasPending ? [] : executions,
    isRunning: activeExecutionId !== undefined || !awaitingObservedRef.current,
    activeExecutionId,
    isError,
    isLoading: queries.some(({ isLoading }) => isLoading),
  };
};
