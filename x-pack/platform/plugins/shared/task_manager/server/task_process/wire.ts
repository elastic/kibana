/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wire format between Task Manager (Kibana) and a task process. Kept free of Kibana runtime imports so
 * the task process can bundle it without pulling in the rest of Task Manager.
 */

import type { SerializedTaskRunError } from '../task_running/errors';
import { deserializeTaskRunError, serializeTaskRunError } from '../task_running/errors';
import type { ConcreteTaskInstance, RunResult } from '../task';
import type { SerializedElasticsearchConfig } from './es_config';

/**
 * The longest a timer can wait: Node treats anything above 2^31-1 ms (about 24.8 days) as 1 ms and
 * warns, which is fatal in Kibana. A task timeout beyond it, such as a workflow's `365d`, is cut at
 * this length.
 */
export const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * First message Kibana sends a task process it forked: everything the process cannot read for
 * itself. A remote process takes the same settings from its environment instead.
 */
export interface TaskProcessInit {
  kind: 'init';
  elasticsearch: SerializedElasticsearchConfig;
  kibanaVersion: string;
  authToken: string;
}

/** The process's answer once it listens, so Kibana can route task types to its port. */
export interface TaskProcessReady {
  kind: 'ready';
  port: number;
}

export interface TaskProcessRunRequest {
  taskType: string;
  /** `ConcreteTaskInstance` with credential fields stripped; dates are ISO strings. */
  taskInstance: Record<string, unknown>;
  executionUuid: string;
  apiKey?: string;
  spaceId?: string;
  uiamApiKeyExternal?: boolean;
  /** ISO time after which Kibana gives up on this run; the process aborts it too. */
  deadline?: string;
  /** The Kibana version dispatching the run; a process built from another version refuses it. */
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

export type TaskProcessRunResponse = (
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
