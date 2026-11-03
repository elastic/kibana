/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wire format between Task Manager (Kibana) and a task pod. Kept free of Kibana runtime imports so
 * the pod host can bundle it without pulling in the rest of Task Manager.
 */

import type { SerializedTaskRunError } from '../task_running/errors';
import { deserializeTaskRunError, serializeTaskRunError } from '../task_running/errors';
import type { ConcreteTaskInstance, RunResult } from '../task';

/**
 * The longest a timer can wait: Node treats anything above 2^31-1 ms (about 24.8 days) as 1 ms and
 * warns, which is fatal in Kibana. A task timeout beyond it, such as a workflow's `365d`, is cut at
 * this length.
 */
export const MAX_TIMER_MS = 2 ** 31 - 1;

export interface PodRunRequest {
  taskType: string;
  /** `ConcreteTaskInstance` with credential fields stripped; dates are ISO strings. */
  taskInstance: Record<string, unknown>;
  executionUuid: string;
  apiKey?: string;
  spaceId?: string;
  userProfileId?: string;
  userName?: string;
  uiamApiKeyExternal?: boolean;
  traceparent?: string;
  /** ISO time after which Kibana gives up on this run; the pod aborts it too. */
  deadline?: string;
  /** The Kibana version dispatching the run; a pod built from another version refuses it. */
  kibanaVersion?: string;
}

export interface SerializedRunResult {
  state: Record<string, unknown>;
  runAt?: string;
  schedule?: unknown;
  priority?: number;
  shouldValidate?: boolean;
  shouldDeleteTask?: boolean;
  shouldDisableTask?: boolean;
  error?: SerializedTaskRunError;
  taskRunError?: SerializedTaskRunError;
}

export type PodRunResponse = (
  | { kind: 'result'; result?: SerializedRunResult }
  | { kind: 'thrown'; error: SerializedTaskRunError }
) & { customTaskRunEventFields?: Record<string, unknown> };

const TASK_INSTANCE_DATE_FIELDS = ['scheduledAt', 'startedAt', 'retryAt', 'runAt'] as const;

export const reviveTaskInstance = (raw: Record<string, unknown>): ConcreteTaskInstance => {
  const revived = { ...raw };
  for (const field of TASK_INSTANCE_DATE_FIELDS) {
    if (typeof revived[field] === 'string') revived[field] = new Date(revived[field] as string);
  }
  return revived as unknown as ConcreteTaskInstance;
};

export const serializeRunResult = (result: RunResult | void): SerializedRunResult | undefined => {
  if (!result) return undefined;
  const { runAt, error, taskRunError, ...rest } = result as RunResult & {
    runAt?: Date;
    error?: Error;
  };
  return {
    ...(rest as unknown as SerializedRunResult),
    ...(runAt ? { runAt: new Date(runAt).toISOString() } : {}),
    ...(error ? { error: serializeTaskRunError(error) } : {}),
    ...(taskRunError ? { taskRunError: serializeTaskRunError(taskRunError) } : {}),
  };
};

export const deserializeRunResult = (serialized?: SerializedRunResult): RunResult | undefined => {
  if (!serialized) return undefined;
  const { runAt, error, taskRunError, ...rest } = serialized;
  return {
    ...rest,
    ...(runAt ? { runAt: new Date(runAt) } : {}),
    ...(error ? { error: deserializeTaskRunError(error) } : {}),
    ...(taskRunError ? { taskRunError: deserializeTaskRunError(taskRunError) } : {}),
  } as unknown as RunResult;
};
