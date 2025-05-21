/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Represents a runner, which is the entry point to execute all onechat primitives,
 * such as tools or agents.
 *
 * This version is pre-scoped to a given request, meaning APIs don't need to be passed
 * down a request object.
 */
export interface ScopedRunner {
  runTool: ScopedRunToolFn;
}

/**
 * Public onechat API to execute a tools.
 */
export type ScopedRunToolFn = <TResult = unknown>(
  params: ScopedRunnerRunToolsParams
) => Promise<TResult>;

/**
 * Params for {@link ScopedRunner.runTool}
 */
export interface ScopedRunnerRunToolsParams<TParams = Record<string, unknown>> {
  toolId: string;
  toolParams: TParams;
}

export interface RunContext {
  runId: string;
  stack: RunContextStackEntry[];
}

/**
 * Represents an element in the run context's stack.
 * Used to follow nested / chained execution.
 */
export type RunContextStackEntry =
  | { type: 'tool'; toolId: string }
  | { type: 'agent'; agentId: string };

/**
 * Params for {@link RunToolFn}
 */
export interface RunToolParams<TParams = Record<string, unknown>> {
  /**
   * ID of the tool to call.
   */
  toolId: string;
  /**
   * Parameters to call the tool with.
   */
  toolParams: TParams;
  /**
   * The request that initiated that run.
   */
  request: KibanaRequest;
  /**
   * Optional genAI connector id to use as default.
   * If unspecified, will use internal logic to use the default connector
   * (EIS if there, otherwise openAI, otherwise any GenAI)
   */
  defaultConnectorId?: string;
}

/**
 * Public onechat API to execute a tools.
 */
export type RunToolFn = <TResult = unknown>(params: RunToolParams) => Promise<TResult>;

/**
 * Public onechat runner.
 */
export interface Runner {
  runTool: RunToolFn;
}
