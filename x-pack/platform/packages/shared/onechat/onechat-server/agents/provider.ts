/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  Conversation,
  ConversationRound,
  RawRoundInput,
  ChatAgentEvent,
  AgentCapabilities,
  AgentConfigurationOverrides,
} from '@kbn/onechat-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { BrowserApiToolMetadata } from '@kbn/onechat-common';
import type {
  ModelProvider,
  ScopedRunner,
  ToolProvider,
  WritableToolResultStore,
  AttachmentsService,
} from '../runner';

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
   * Id of the space associated with the request
   */
  spaceId: string;
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
   * Attachment service to interact with attachments.
   */
  attachments: AttachmentsService;
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
   * Current conversation
   */
  conversation?: Conversation;
  /**
   * The input triggering this round.
   */
  nextInput: RawRoundInput;
  /**
   * Agent capabilities to enable.
   */
  capabilities?: AgentCapabilities;
  browserApiTools?: BrowserApiToolMetadata[];
  /**
   * Whether to use structured output mode. When true, the agent will return structured data instead of plain text.
   */
  structuredOutput?: boolean;
  /**
   * Optional JSON schema for structured output. Only used when structuredOutput is true.
   * If not provided, uses a default schema.
   */
  outputSchema?: Record<string, unknown>;
  /**
   * Optional runtime configuration overrides.
   * These override the stored agent configuration for this execution only.
   */
  configurationOverrides?: AgentConfigurationOverrides;
}

export interface AgentResponse {
  /**
   * The full round of conversation, can be used for persistence for example.
   */
  round: ConversationRound;
}
