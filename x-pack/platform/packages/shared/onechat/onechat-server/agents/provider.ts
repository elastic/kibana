/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  type ConversationRound,
  type RoundInput,
  type ChatAgentEvent,
  type AgentCapabilities,
} from '@kbn/onechat-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ModelProvider, ScopedRunner, ToolProvider, WritableToolResultStore } from '../runner';

export type AgentHandlerFn = (
  params: AgentHandlerParams,
  context: AgentHandlerContext
) => Promise<AgentHandlerReturn>;

export interface AgentHandlerParams {
  /** The params that the agent execution API was called with */
  agentParams: AgentParams;
  /** ID of this run */
  runId: string;
  /** optional signal to abort the execution of the agent */
  abortSignal?: AbortSignal;
}

export interface AgentHandlerReturn {
  /** The plain result of the agent */
  result: AgentResponse;
}

export interface AgentHandlerContext {
  /**
   * The request that was provided when initiating that tool execution.
   * Can be used to create scoped services not directly exposed by this context.
   */
  request: KibanaRequest;
  /**
   * A cluster client scoped to the current user.
   * Can be used to access ES on behalf of either the current user or the system user.
   */
  esClient: IScopedClusterClient;
  /**
   * Inference model provider scoped to the current user.
   * Can be used to access the inference APIs or chatModel.
   */
  modelProvider: ModelProvider;
  /**
   * Tool provider that can be used to list or execute tools.
   */
  toolProvider: ToolProvider;
  /**
   * Onechat runner scoped to the current execution.
   */
  runner: ScopedRunner;
  /**
   * Result store to access and add tool results during execution.
   */
  resultStore: WritableToolResultStore;
  /**
   * Event emitter that can be used to emits custom events
   */
  events: AgentEventEmitter;
  /**
   * Logger scoped to this execution
   */
  logger: Logger;
}

/**
 * Event handler function to listen to run events during execution of tools, agents or other onechat primitives.
 */
export type AgentEventEmitterFn = (event: ChatAgentEvent) => void;

export interface AgentEventEmitter {
  emit: AgentEventEmitterFn;
}

// conversational

export interface AgentParams {
  /**
   * Previous rounds of conversation.
   * Defaults to an empty list (new conversation)
   */
  conversation?: ConversationRound[];
  /**
   * The input triggering this round.
   */
  nextInput: RoundInput;
  /**
   * Agent capabilities to enable.
   */
  capabilities?: AgentCapabilities;
}

export interface AgentResponse {
  /**
   * The full round of conversation, can be used for persistence for example.
   */
  round: ConversationRound;
}
