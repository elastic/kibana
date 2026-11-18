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

import type { TelemetryFileMaterial } from '@kbn/apm-config-loader';
import type { HttpSelfClientDispatchConfig } from '@kbn/core-http-server';
import type { TaskRunTrace } from '../task_running/task_tracing';
import type { SerializedTaskRunError } from '../task_running/errors';
import { deserializeTaskRunError, serializeTaskRunError } from '../task_running/errors';
import type { ConcreteTaskInstance, RunResult, TaskRunAs } from '../task';
import type { SerializedElasticsearchConfig } from './es_config';
import type { SerializedValue } from './settings';
import type { TaskProcessParity } from './parity';
import type { TASK_PROCESS_PROTOCOL_VERSION } from './protocol';
import type { TaskFeatureFlagDefinitions } from './feature_flag_declarations';

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
  executionContext?: { enabled: boolean };
  instrumentation?: {
    files: readonly TelemetryFileMaterial[];
    environment: Record<string, string>;
    apm: SerializedValue;
    redactUsers: boolean;
    telemetry: SerializedValue;
    monitoringCollection: SerializedValue;
  };
  elasticsearch: SerializedElasticsearchConfig;
  kibanaVersion: string;
  authToken: string;
  /** Kibana's identity and public address. */
  server?: TaskProcessServerInfo;
  /** Only when the module declares encrypted saved object types. */
  encryptedSavedObjects?: { encryptionKey?: string; decryptionOnlyKeys: string[] };
  /** Kibana's `uiSettings.overrides`, only when the module declares ui settings. */
  uiSettingsOverrides?: Record<string, unknown>;
  /** Kibana's `uiSettings.globalOverrides`, only when the module declares ui settings. */
  uiSettingsGlobalOverrides?: Record<string, unknown>;
  /**
   * What Kibana has registered, which the process compares with what it registered itself before it
   * runs anything (see `TaskTypeModule.parity`). Absent for a remote process.
   */
  parity?: TaskProcessParity;
  /**
   * Ids of the packs this process should load, read from `TaskTypeRegistrationOptions.getPacks` for
   * the run being dispatched. Absent (not empty) means every pack the bundle declares, which is the
   * pre-pack behavior; a remote process not sent one takes the same default.
   */
  packs?: string[];
  /** Plugin configs by plugin id in `serializeSettings` format; only the ids the module declares. */
  settings?: Record<string, SerializedValue>;
}

export interface TaskProcessServerInfo {
  uuid: string;
  buildNum: number;
  /**
   * Kibana's `server.publicBaseUrl` as Core has it: absent when Kibana has none, so the links a run
   * builds are empty exactly when Kibana's are. Never the address a process reaches Kibana at.
   */
  publicBaseUrl?: string;
  /**
   * Where a process reaches this Kibana over HTTP: its public URL, or its own address when none is
   * configured. Core's self client calls it with the run's credentials (it is the `publicBaseUrl` of
   * the process's Core, which a run never reads for links: those use `publicBaseUrl` above).
   */
  kibanaUrl?: string;
  selfHttp?: HttpSelfClientDispatchConfig;
  isServerless: boolean;
  /**
   * Kibana's `server.basePath`, which the self client prefixes to every path and which Core requires
   * a `publicBaseUrl` with a path to contain.
   */
  basePath?: string;
  /** Kibana runs from source, which loosens a few of Core's config checks. */
  isDev?: boolean;
}

/** The process's answer once it listens, so Kibana can route task types to its port. */
export interface TaskProcessReady {
  kind: 'ready';
  port: number;
  protocolVersion: typeof TASK_PROCESS_PROTOCOL_VERSION;
  capabilities: readonly string[];
  featureFlags?: TaskFeatureFlagDefinitions;
  /** `process.memoryUsage().rss`, read as this process starts listening: its idle RSS. */
  rss?: number;
}

/** Configuration and registrations captured for one dispatch in either process mode. */
export interface TaskProcessDispatchSnapshot {
  protocolVersion: typeof TASK_PROCESS_PROTOCOL_VERSION;
  init: Omit<TaskProcessInit, 'kind' | 'authToken'>;
  featureFlags?: Record<string, boolean | string | number>;
}

export interface TaskProcessRunRequest {
  protocolVersion: typeof TASK_PROCESS_PROTOCOL_VERSION;
  tracing?: TaskRunTrace;
  taskType: string;
  /** `ConcreteTaskInstance` with credential fields stripped; dates are ISO strings. */
  taskInstance: Record<string, unknown>;
  executionUuid: string;
  snapshot?: TaskProcessDispatchSnapshot;
  /** Bounded time for this task type to persist cancellation before forced termination. */
  cancelGracePeriodMs?: number;
  apiKey?: string;
  /** Verified workload identity; the process resolves its scoped service-account request. */
  runAs?: TaskRunAs;
  spaceId?: string;
  uiamApiKeyExternal?: boolean;
  userProfileId?: string;
  userName?: string;
  /**
   * The values of the feature flags the task type declares, which Kibana evaluated when it
   * dispatched this run (so Cloud's flag service, which only Kibana reaches, answers).
   */
  featureFlags?: Record<string, boolean | string | number>;
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

export interface TaskProcessMetricSnapshot {
  sequence: number;
  encoded: string;
}

export interface TaskProcessRunMetrics {
  prometheus?: TaskProcessMetricSnapshot;
  createdTaskCount?: number;
  activePoolRequestIds?: string[];
}

export type TaskProcessRunResponse = (
  | { kind: 'result'; result?: SerializedRunResult }
  | { kind: 'thrown'; error: SerializedTaskRunError }
) & {
  /** Native tasks created during this execution, including before a run error. */
  createdTaskCount?: number;
  prometheus?: TaskProcessMetricSnapshot;
  customTaskRunEventFields?: Record<string, unknown>;
  /** True only when this process supports reuse and the run's cleanup and flush succeeded. */
  reusable?: boolean;
};

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

/** Body of a capability failure (status 422), reported without local execution. */
export interface TaskProcessDeclinedResponse {
  kind: 'declined';
  reason: string;
}

export const DECLINED_STATUS = 422;
