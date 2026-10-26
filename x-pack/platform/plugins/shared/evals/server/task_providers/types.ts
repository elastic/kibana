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
} as const;

export type BuiltInTaskProviderName =
  (typeof BUILT_IN_TASK_PROVIDERS)[keyof typeof BUILT_IN_TASK_PROVIDERS];

/** Minimal API-calling interface exposed to task providers. */
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
  input: Record<string, unknown>;
  connectorId: string;
  agentId?: string;
  params?: Record<string, unknown>;
  logger: EvalsStepLogger;
  abortSignal: AbortSignal;
  getInferenceClient: (connectorId: string) => Promise<BoundInferenceClient>;
  callKibanaApi: EvalsCallKibanaApi;
}

export type EvalsTaskResult = TaskResult;

/**
 * A task provider knows how to execute "the thing being evaluated" for a single
 * example: a raw LLM call, an Agent Builder conversation, or a suite-specific
 * function registered by another plugin.
 */
export interface EvalsTaskProvider {
  name: string;
  description?: string;
  run: (ctx: EvalsTaskContext) => Promise<EvalsTaskResult>;
}

export interface TaskProviderRegistry {
  register: (provider: EvalsTaskProvider) => void;
  get: (name: string) => EvalsTaskProvider | undefined;
  has: (name: string) => boolean;
  list: () => EvalsTaskProvider[];
}
