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
  /** Where and how the pod calls back into Kibana for remote plugin contracts. */
  callback?: { url: string; token: string };
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

export interface PodContractCallRequest {
  token: string;
  pluginId: string;
  method: string;
  args: unknown[];
}

export type PodContractCallResponse =
  | { result: unknown }
  | { error: SerializedTaskRunError; notFound?: boolean };

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

/**
 * A `KibanaRequest` argument never crosses the wire as an object (it carries live state). The pod
 * sends this marker holding only what identifies the request, its `authorization` header and
 * space, and Kibana rebuilds a fake request from it. Each request keeps its own identity: a task
 * may call a contract with requests built from credentials other than its own (for example an
 * action policy's API key).
 */
export const POD_REQUEST_MARKER = '__podRequest';

export interface PodRequestIdentity {
  authorization?: string;
  spaceId?: string;
  userProfileId?: string;
  userName?: string;
  /** The key is an external (user-created) UIAM key, which must not carry the UIAM shared secret. */
  uiamApiKeyExternal?: boolean;
}

type ExtraIdentity = Pick<PodRequestIdentity, 'userProfileId' | 'userName' | 'uiamApiKeyExternal'>;

/**
 * What a request carries beyond its headers (user, UIAM verdict) lives in process-local state a
 * pod keeps itself, so the pod host registers how to read it; Kibana rebuilds it on the other side.
 */
let describeRequestExtras: (request: object) => ExtraIdentity | undefined = () => undefined;
export const setPodRequestExtrasReader = (
  reader: (request: object) => ExtraIdentity | undefined
) => {
  describeRequestExtras = reader;
};

const isKibanaRequestLike = (
  value: unknown
): value is {
  headers: Record<string, unknown>;
  spaceId?: string;
} =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'isSystemRequest' in value &&
      'headers' in value &&
      'route' in value
  );

export const encodePodArgs = (args: unknown[]): string =>
  JSON.stringify(args, function replacer(this: Record<string, unknown>, key, value) {
    // `value` has already been through `toJSON()`, which for a real `KibanaRequest` drops what
    // identifies it as one, so look at the raw property.
    const raw = this[key];
    return isKibanaRequestLike(raw)
      ? {
          [POD_REQUEST_MARKER]: {
            authorization: raw.headers.authorization as string | undefined,
            spaceId: raw.spaceId,
            ...describeRequestExtras(raw),
          } satisfies PodRequestIdentity,
        }
      : value;
  });
