/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ChatCompletionReasoningEffort,
  ConnectorTelemetryMetadata,
} from '@kbn/inference-common';
import type {
  ChatAgentEvent,
  AgentExecutionMode,
  InteractivityConfigInput,
} from '@kbn/agent-builder-common';
import type { AgentParams, AgentResponse, ExecutionConversationAccess } from './provider';
import type { ExecutionRunAs } from '../execution/types';

export interface RunAgentReturn {
  /** return from the agent */
  result: AgentResponse;
}

/**
 * Params for {@link RunAgentFn}
 */
export interface RunAgentParams {
  /**
   * Execution mode for this run. When 'standalone', HITL is disabled by default.
   **/
  executionMode?: AgentExecutionMode;
  /**
   * Interactivity configuration for this run,
   */
  interactive?: InteractivityConfigInput;
  /**
   * The id of the parent execution that spawned this one, when applicable.
   */
  parentExecutionId?: string;
  /**
   * How this run relates to its conversation, see {@link ExecutionConversationAccess}. Defaults to
   * `readWrite`.
   */
  conversationAccess?: ExecutionConversationAccess;
  /**
   * The workflow execution whose `ai.agent` step started this run, when applicable; passed on to
   * the sub-agents the run spawns so their rounds join to the same workflow run.
   */
  workflowExecutionId?: string;
  /**
   * ID of the agent to call.
   */
  agentId: string;
  /**
   * Parameters to call the agent with.
   */
  agentParams: AgentParams;
  /**
   * The identity conversation writes are attributed to when it differs from the request's
   * principal, as when the request carries a bound service account's credential.
   */
  owner?: UserIdAndName;
  /**
   * The service account the execution runs as. The agent is then resolved for that account
   * rather than through the request's access control, which already authorized the run at
   * dispatch.
   */
  runAs?: ExecutionRunAs;
  /**
   * ID of the agent execution to associate with the run.
   */
  executionId?: string;
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
  /**
   * Optional connector telemetry used to attribute this run's LLM calls to a specific
   * feature. When omitted, the default Agent Builder telemetry is used.
   */
  telemetryMetadata?: ConnectorTelemetryMetadata;
  /**
   * Optional connector response content length override for buffered LLM calls.
   */
  maxContentLength?: number;
  /**
   * Optional reasoning level forwarded to the inference plugin.
   */
  reasoningLevel?: ChatCompletionReasoningEffort;
  /**
   * Optional CPS project routing expression to scope this run's search tools to a specific projects
   */
  projectRouting?: string;
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
