/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import {
  AgentType,
  AgentMode,
  type ConversationRound,
  type RoundInput,
  type ChatAgentEvent,
  type AgentIdentifier,
  type PlainIdAgentIdentifier,
} from '@kbn/onechat-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ModelProvider } from '../src/model_provider';
import type { ToolProvider } from '../src/tools';
import type { ScopedRunner } from '../src/runner';

export type AgentHandlerFn<TParams, TResponse> = (
  params: AgentHandlerParams<TParams>,
  context: AgentHandlerContext
) => Promise<AgentHandlerReturn<TResponse>>;

export interface AgentHandlerParams<TParams> {
  /** The params that the agent execution API was called with */
  agentParams: TParams;
  /** ID of this run */
  runId: string;
}

export interface AgentHandlerReturn<TResult> {
  /** The plain result of the agent */
  result: TResult;
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
   * Can be used to run other workchat primitive as part of the tool execution.
   */
  runner: ScopedRunner;
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

export interface ConversationalAgentParams {
  /**
   * Agent mode to use for this round.
   * Defaults to `normal`.
   */
  agentMode?: AgentMode;
  /**
   * Previous rounds of conversation.
   * Defaults to an empty list (new conversation)
   */
  conversation?: ConversationRound[];
  /**
   * The input triggering this round.
   */
  nextInput: RoundInput;
}

export interface ConversationalAgentResponse {
  /**
   * The full round of conversation, can be used for persistence for example.
   */
  round: ConversationRound;
}

/**
 * Conversational agent handler
 */
export type ConversationalAgentHandlerFn = AgentHandlerFn<
  ConversationalAgentParams,
  ConversationalAgentResponse
>;

export interface AgentDefinitionBase<TType extends AgentType, TParams, TResponse> {
  type: TType;
  id: PlainIdAgentIdentifier;
  description: string;
  handler: AgentHandlerFn<TParams, TResponse>;
}

export interface ConversationalAgentDefinition
  extends AgentDefinitionBase<
    AgentType.conversational,
    ConversationalAgentParams,
    ConversationalAgentResponse
  > {
  type: AgentType.conversational;
  handler: ConversationalAgentHandlerFn;
}

export type AgentDefinition = ConversationalAgentDefinition;

/**
 * Provider that can be registered to expose agents to onechat
 */
export interface AgentProvider<TAgent = AgentDefinition> {
  has(opts: { agentId: AgentIdentifier; request: KibanaRequest }): MaybePromise<boolean>;
  get(opts: { agentId: AgentIdentifier; request: KibanaRequest }): MaybePromise<TAgent>;
  list(opts: { request: KibanaRequest }): MaybePromise<TAgent[]>;
}
