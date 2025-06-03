/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentIdentifier, ChatAgentEvent } from '@kbn/onechat-common';

export interface RunAgentReturn<TResult = unknown> {
  /** return from the agent */
  result: TResult;
  /** ID of this run */
  runId: string;
}

/**
 * Params for {@link RunAgentFn}
 */
export interface RunAgentParams<TParams = Record<string, unknown>> {
  /**
   * ID of the agent to call.
   */
  agentId: AgentIdentifier;
  /**
   * Parameters to call the agent with.
   */
  agentParams: TParams;
  /**
   * Optional event handler.
   */
  onEvent?: RunAgentOnEventFn;
  /**
   * The request that initiated that run.
   */
  request: KibanaRequest;
  /**
   * Optional genAI connector id to use as default.
   * If unspecified, will use internal logic to use the default connector
   */
  defaultConnectorId?: string;
}

export type RunAgentOnEventFn = (event: ChatAgentEvent) => void;

/**
 * Params for {@link ScopedRunner.runTool}
 */
export type ScopedRunnerRunAgentParams<TParams = Record<string, unknown>> = Omit<
  RunAgentParams<TParams>,
  'request'
>;

/**
 * Public onechat API to execute a tools.
 */
export type RunAgentFn = <TParams = Record<string, unknown>, TResult = unknown>(
  params: RunAgentParams<TParams>
) => Promise<RunAgentReturn<TResult>>;

/**
 * Public onechat API to execute a tools.
 */
export type ScopedRunAgentFn = <TParams = Record<string, unknown>, TResult = unknown>(
  params: ScopedRunnerRunAgentParams<TParams>
) => Promise<RunAgentReturn<TResult>>;
