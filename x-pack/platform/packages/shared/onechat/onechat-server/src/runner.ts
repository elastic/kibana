/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SerializedToolIdentifier } from '@kbn/onechat-common';
import type { ToolEventHandlerFn } from './events';
import type { RunAgentFn, ScopedRunAgentFn } from '../agents/runner';

/**
 * Return type for tool invocation APIs.
 *
 * Wrapping the plain result to allow extending the shape later without
 * introducing breaking changes.
 */
export interface RunToolReturn<TResult = unknown> {
  /**
   * The result value as returned by the tool.
   */
  result: TResult;
  /**
   * ID of this run
   */
  runId: string;
}

/**
 * Represents a runner, which is the entry point to execute all onechat primitives,
 * such as tools or agents.
 *
 * This version is pre-scoped to a given request, meaning APIs don't need to be passed
 * down a request object.
 */
export interface ScopedRunner {
  /**
   * Execute a tool.
   */
  runTool: ScopedRunToolFn;
  /**
   * Execute an agent
   */
  runAgent: ScopedRunAgentFn;
}

/**
 * Public onechat API to execute a tools.
 */
export type ScopedRunToolFn = <TParams = Record<string, unknown>, TResult = unknown>(
  params: ScopedRunnerRunToolsParams<TParams>
) => Promise<RunToolReturn<TResult>>;

/**
 * Context bound to a run execution.
 * Contains metadata associated with the run's current state.
 * Will be attached to errors thrown during a run.
 */
export interface RunContext {
  /**
   * The run identifier, which can be used for tracing
   */
  runId: string;
  /**
   * The current execution stack
   */
  stack: RunContextStackEntry[];
}

/**
 * Represents an element in the run context's stack.
 * Used to follow nested / chained execution.
 */
export type RunContextStackEntry =
  /** tool invocation */
  | { type: 'tool'; toolId: SerializedToolIdentifier }
  /** agent invocation */
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
   * Optional event handler.
   */
  onEvent?: ToolEventHandlerFn;
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
 * Params for {@link ScopedRunner.runTool}
 */
export type ScopedRunnerRunToolsParams<TParams = Record<string, unknown>> = Omit<
  RunToolParams<TParams>,
  'request'
>;

/**
 * Public onechat API to execute a tools.
 */
export type RunToolFn = <TParams = Record<string, unknown>, TResult = unknown>(
  params: RunToolParams<TParams>
) => Promise<RunToolReturn<TResult>>;

/**
 * Public onechat runner.
 */
export interface Runner {
  /**
   * Execute a tool.
   */
  runTool: RunToolFn;
  /**
   * Execute an agent;
   */
  runAgent: RunAgentFn;
}
