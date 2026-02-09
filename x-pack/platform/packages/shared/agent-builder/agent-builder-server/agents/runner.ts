/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatAgentEvent } from '@kbn/agent-builder-common';
import type { AgentParams, AgentResponse } from './provider';

export interface RunAgentReturn {
  /** return from the agent */
  result: AgentResponse;
}

/**
 * Params for {@link RunAgentFn}
 */
export interface RunAgentParams {
  /**
   * ID of the agent to call.
   */
  agentId: string;
  /**
   * Parameters to call the agent with.
   */
  agentParams: AgentParams;
  /**
   * Optional event handler.
   */
  onEvent?: RunAgentOnEventFn;
  /**
   * Optional signal to abort the execution of the agent.
   */
  abortSignal?: AbortSignal;
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
export type ScopedRunnerRunAgentParams = Omit<RunAgentParams, 'request'>;

/**
 * Public agentBuilder API to execute an agent.
 */
export type RunAgentFn = (params: RunAgentParams) => Promise<RunAgentReturn>;

/**
 * Public agentBuilder API to execute an agent.
 */
export type ScopedRunAgentFn = (params: ScopedRunnerRunAgentParams) => Promise<RunAgentReturn>;
