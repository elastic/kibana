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
  ConverseInput,
  ChatAgentEvent,
  AgentCapabilities,
  AgentConfigurationOverrides,
  ConversationAction,
} from '@kbn/agent-builder-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type {
  ModelProvider,
  ScopedRunner,
  ToolProvider,
  WritableToolResultStore,
  AttachmentsService,
  PromptManager,
  ConversationStateManager,
  SkillsService,
  ToolManager,
} from '../runner';
import type { IFileStore } from '../runner/filestore';
import type { AttachmentStateManager } from '../attachments';
import type { AgentBuilderHooks } from '../hooks/types';
import type { ToolRegistry } from '../tools';

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

/**
 * Experimental features configuration for agent builder.
 */
export interface ExperimentalFeatures {
  /** Whether the filestore feature is enabled */
  filestore: boolean;
  /** Whether the skills feature is enabled */
  skills: boolean;
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
   * Saved objects client scoped to the current user.
   */
  savedObjectsClient?: SavedObjectsClientContract;
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
   * Tool registry for accessing internal tool definitions.
   * Used for features like tool-specific result summarization.
   */
  toolRegistry: ToolRegistry;
  /**
   * AgentBuilder runner scoped to the current execution.
   */
  runner: ScopedRunner;
  /**
   * Attachment service to interact with attachments.
   */
  attachments: AttachmentsService;
  /**
   * Skills service to interact with skills.
   */
  skills: SkillsService;
  /**
   * Tool manager to manage active tools for the agent.
   */
  toolManager: ToolManager;
  /**
   * Result store to access and add tool results during execution.
   */
  resultStore: WritableToolResultStore;
  /**
   * Attachment state manager to manage conversation attachments during execution.
   */
  attachmentStateManager: AttachmentStateManager;
  /**
   * Used to manage interruptions.
   */
  promptManager: PromptManager;
  /**
   * Used to access and store state during interrupted executions.
   */
  stateManager: ConversationStateManager;
  /**
   * Event emitter that can be used to emits custom events
   */
  events: AgentEventEmitter;
  /**
   * Logger scoped to this execution
   */
  logger: Logger;
  /**
   * Hooks service for agent lifecycle interception.
   */
  hooks: AgentBuilderHooks;
  /**
   * File store to access data from the agent's virtual filesystem
   */
  filestore: IFileStore;
  /**
   * Experimental features configuration for this agent execution.
   * Determined by the UI setting at the start of execution.
   */
  experimentalFeatures: ExperimentalFeatures;
}

/**
 * Event handler function to listen to run events during execution of tools, agents or other agentBuilder primitives.
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
  nextInput: ConverseInput;
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
  /**
   * The action to perform: "regenerate" re-executes the last round with original input (requires conversation_id).
   */
  action?: ConversationAction;
}

export interface AgentResponse {
  /**
   * The full round of conversation, can be used for persistence for example.
   */
  round: ConversationRound;
}
