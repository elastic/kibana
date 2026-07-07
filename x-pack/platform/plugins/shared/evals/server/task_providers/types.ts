/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { TaskResult } from '@kbn/evals-runner';

/**
 * The minimal logger surface available to a task provider. Matches both the
 * workflow step's `context.logger` and a full `@kbn/logging` `Logger`.
 */
export interface EvalsStepLogger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

/** Identifiers of the task providers shipped with the evals plugin. */
export const BUILT_IN_TASK_PROVIDERS = {
  inference: 'inference',
  agentBuilderConverse: 'agentBuilder.converse',
  agentBuilderTool: 'agentBuilder.tool',
} as const;

export type BuiltInTaskProviderName =
  (typeof BUILT_IN_TASK_PROVIDERS)[keyof typeof BUILT_IN_TASK_PROVIDERS];

/**
 * A workflow-agnostic view of the workflow engine's `callKibanaApi`. Kept local
 * so task providers do not have to depend on `@kbn/workflows-extensions`.
 */
export type EvalsCallKibanaApi = <T = unknown>(params: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}) => Promise<{ status: number; headers: Record<string, string>; body: T }>;

/**
 * The runtime handed to a task provider. It abstracts away whether the caller is
 * a workflow step or a plain route, exposing only what a provider needs to run
 * the feature under evaluation and correlate the resulting trace.
 */
export interface EvalsTaskContext {
  /** The example input (a single dataset row's `input`). */
  input: Record<string, unknown>;
  /** The connector id of the model under evaluation. */
  connectorId: string;
  /** Agent Builder agent id (for `agentBuilder.converse`). */
  agentId?: string;
  /** Agent Builder tool id (for `agentBuilder.tool`). */
  toolId?: string;
  /** Free-form provider parameters supplied by the step/route. */
  params?: Record<string, unknown>;
  logger: EvalsStepLogger;
  abortSignal: AbortSignal;
  /** Returns an inference client bound to the given connector id. */
  getInferenceClient: (connectorId: string) => Promise<BoundInferenceClient>;
  /** Calls an internal or public Kibana API using the caller's credentials. */
  callKibanaApi: EvalsCallKibanaApi;
}

/** The outcome of a task execution: an output payload and the correlating trace id. */
export type EvalsTaskResult = TaskResult;

/**
 * A task provider knows how to execute "the thing being evaluated" for a single
 * example: a raw LLM call, an Agent Builder conversation, an Agent Builder tool,
 * or a suite-specific function registered by another plugin.
 */
export interface EvalsTaskProvider {
  /** Unique provider id, e.g. `inference` or a suite-owned id like `sigEvents.identify`. */
  name: string;
  /** Optional human-readable description surfaced in the UI/registry listing. */
  description?: string;
  run: (ctx: EvalsTaskContext) => Promise<EvalsTaskResult>;
}

export interface TaskProviderRegistry {
  register: (provider: EvalsTaskProvider) => void;
  get: (name: string) => EvalsTaskProvider | undefined;
  has: (name: string) => boolean;
  list: () => EvalsTaskProvider[];
}
