/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type {
  Conversation,
  ConversationWithoutRounds,
  ConversationListOptions,
} from '@kbn/agent-builder-common';
import type { StaticToolRegistration, ToolRegistry } from './tools';
import type { AttachmentTypeDefinition } from './attachments';
import type { RendererTypeDefinition } from './renderers';
import type { SkillDefinition } from './skills';
import type { SkillRegistry } from './skills/registry';
import type { BuiltInAgentDefinition, AgentRegistry } from './agents';
import type { RunToolFn, ModelProvider } from './runner';
import type { RunAgentFn } from './agents';
import type { HooksServiceSetup } from './hooks/types';
import type { BuiltInPluginDefinition, PluginRegistry } from './plugins';
import type {
  ExecuteAgentParams,
  ExecuteAgentResult,
  AgentExecution,
  FindExecutionsOptions,
} from './execution';
import type {
  SmlTypeDefinition,
  SmlSearchResult,
  SmlAutocompleteResult,
  SmlDocument,
  SmlSearchFilters,
  SmlSearchConstraints,
  SmlIndexerParams,
  SmlIndexerDeleteAttachmentParams,
} from './sml/types';

/**
 * AgentBuilder tool service's setup contract.
 */
export interface ToolsSetup {
  /**
   * Register a built-in tool to be available in agentBuilder.
   */
  register<RunInput extends ZodObject<any>>(tool: StaticToolRegistration<RunInput>): void;
}

/**
 * AgentBuilder tool service's start contract.
 */
export interface ToolsStart {
  /**
   * Execute a tool.
   */
  execute: RunToolFn;
  /**
   * Return a tool registry scoped to the current user and context.
   */
  getRegistry: (opts: { request: KibanaRequest }) => Promise<ToolRegistry>;
}

export interface AttachmentsSetup {
  /**
   * Register an attachment type to be available in agentBuilder.
   */
  registerType(attachmentType: AttachmentTypeDefinition): void;
}

export interface RenderersSetup {
  /**
   * Register a renderer type to be available in agentBuilder.
   *
   * A matching browser-side UI definition must be registered with the same
   * `type` (via the browser plugin's `renderers.register`). Otherwise the
   * agent will be told it can render this type, but `<render>` directives for
   * it will fail to resolve in the UI.
   */
  register(rendererType: RendererTypeDefinition): void;
}

export interface SkillsSetup {
  /**
   * Register a built-in skill to be available in agentBuilder.
   * Registration is synchronous; validation is deferred to start.
   */
  register(skill: SkillDefinition): void;
}

/**
 * AgentBuilder skills service's start contract.
 */
export interface SkillsStart {
  /**
   * Create a skill registry scoped to the current user and context.
   * The registry provides access to both built-in and persisted skills.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<SkillRegistry>;
  /**
   * Register a skill dynamically after plugin start.
   * Only affects future conversations (existing ones snapshot skills at creation time).
   */
  register: (skill: SkillDefinition) => Promise<void>;
}

export interface AgentsSetup {
  /**
   * Register a built-in agent to be available in agentBuilder.
   */
  register: (definition: BuiltInAgentDefinition) => void;
}

export interface AgentsStart {
  /**
   * Executes an agent with the given parameters.
   * @deprecated use execution service instead.
   */
  runAgent: RunAgentFn;
  /**
   * Return an agent registry scoped to the current user and context.
   */
  getRegistry: (opts: { request: KibanaRequest }) => Promise<AgentRegistry>;
}

/**
 * AgentBuilder execution service's start contract.
 */
export interface ExecutionStart {
  /**
   * Execute an agent.
   */
  executeAgent(params: ExecuteAgentParams): Promise<ExecuteAgentResult>;
  /**
   * Retrieve an agent execution by its ID.
   */
  getExecution(executionId: string): Promise<AgentExecution | undefined>;
  /**
   * Find executions matching the given filters.
   */
  findExecutions(
    request: KibanaRequest,
    options?: FindExecutionsOptions
  ): Promise<AgentExecution[]>;
}

export interface PluginsSetup {
  /**
   * Register a built-in plugin to be available in agentBuilder.
   * Built-in plugins are read-only and registered programmatically by solution teams.
   */
  register: (plugin: BuiltInPluginDefinition) => void;
}

/**
 * AgentBuilder plugins service's start contract.
 */
export interface PluginsStart {
  /**
   * Return a plugin registry scoped to the current user and context.
   * The registry provides access to both built-in and persisted plugins.
   */
  getRegistry: (opts: { request: KibanaRequest }) => PluginRegistry;
}

/**
 * AgentBuilder runtime service's start contract.
 */
export interface RuntimeStart {
  /**
   * Creates a model provider for the given request context.
   * The model provider can be used to obtain a ScopedModel for use
   * with utilities like `generateEsql` from `@kbn/agent-builder-genai-utils`.
   */
  createModelProvider: (opts: {
    request: KibanaRequest;
    defaultConnectorId?: string;
  }) => ModelProvider;
}

/**
 * A read-only conversation client exposing only get and list operations.
 */
export interface ReadOnlyConversationClient {
  /**
   * Retrieve a single conversation by its ID, including all rounds.
   */
  get(conversationId: string): Promise<Conversation>;
  /**
   * List conversations for the current user, optionally filtered by agent ID.
   */
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
}

/**
 * AgentBuilder conversations service's start contract (read-only).
 */
export interface ConversationsStart {
  /**
   * Returns a read-only conversation client scoped to the given request's user and space.
   */
  getScopedClient(opts: { request: KibanaRequest }): Promise<ReadOnlyConversationClient>;
}

/**
 * Configuration for the TOP_SNIPPETS search utility.
 */
export interface TopSnippetsConfig {
  numSnippets: number;
  numWords: number;
}

/**
 * Result of resolving a single SML chunk id into attachment data via
 * {@link AgentBuilderSmlServiceStart.resolveSmlAttachItems}.
 */
export type AgentBuilderSmlResolvedItemResult =
  | {
      success: true;
      chunk_id: string;
      attachment: {
        type: string;
        data: unknown;
        origin: string;
        description: string;
      };
    }
  | {
      success: false;
      chunk_id: string;
      attachment_type?: string;
      message: string;
    };

/**
 * AgentBuilder SML service's setup contract.
 */
export interface AgentBuilderSmlServiceSetup {
  /**
   * Register an SML type definition. Should be called during plugin setup.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

/**
 * AgentBuilder SML service's start contract.
 */
export interface AgentBuilderSmlServiceStart {
  search: (params: {
    query: string;
    size?: number;
    fields?: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    constraints?: SmlSearchConstraints;
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[] }>;
  autocomplete: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    constraints?: SmlSearchConstraints;
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlAutocompleteResult[] }>;
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;
  indexAttachment: (params: SmlIndexerParams) => Promise<void>;
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;
  findByOrigin: (params: {
    type: string;
    originId: string;
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<SmlDocument[]>;
  findByOriginAcrossSpaces: (params: {
    type: string;
    originId: string;
    esClient: IScopedClusterClient;
  }) => Promise<SmlDocument[]>;
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;
  listTypeDefinitions: () => SmlTypeDefinition[];
  resolveSmlAttachItems: (params: {
    chunkIds: string[];
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    spaceId: string;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) => Promise<AgentBuilderSmlResolvedItemResult[]>;
}

/**
 * Setup contract of the agentBuilder plugin.
 */
export interface AgentBuilderPluginSetup {
  /**
   * Agents setup contract, which can be used to register built-in agents.
   */
  agents: AgentsSetup;
  /**
   * Tools setup contract, which can be used to register built-in tools.
   */
  tools: ToolsSetup;
  /**
   * Attachments setup contract, which can be used to register attachment types.
   */
  attachments: AttachmentsSetup;
  /**
   * Renderers setup contract, which can be used to register renderer types.
   */
  renderers: RenderersSetup;
  /**
   * Hooks setup contract, which can be used to register lifecycle event hooks.
   */
  hooks: HooksServiceSetup;
  /**
   * Skills setup contract, which can be used to register skills.
   */
  skills: SkillsSetup;
  /**
   * Plugins setup contract, which can be used to register built-in plugins.
   */
  plugins: PluginsSetup;
  /**
   * SML service setup contract, which can be used to register SML type definitions.
   *
   * Not yet consumed anywhere — the built-in SML tools still call the older
   * `agentContextLayer.registerType`. This is a parallel, independently-tested
   * path that a future PR will cut consumers over to.
   */
  smlService: AgentBuilderSmlServiceSetup;
  /**
   * TOP_SNIPPETS configuration (numSnippets, numWords) from `xpack.agentBuilder.topSnippets`.
   * Exposed so that dependent plugins can pass these values to search utilities.
   */
  topSnippets: TopSnippetsConfig;
}

/**
 * Start contract of the agentBuilder plugin.
 */
export interface AgentBuilderPluginStart {
  /**
   * Agents service, to execute agents.
   */
  agents: AgentsStart;
  /**
   * Tools service, to manage or execute tools.
   */
  tools: ToolsStart;
  /**
   * Skills service, to manage and access skills.
   */
  skills: SkillsStart;
  /**
   * Plugins service, to query built-in and persisted plugins.
   */
  plugins: PluginsStart;
  /**
   * Execution service, to execute agents and retrieve execution status.
   */
  execution: ExecutionStart;
  /**
   * Runtime utilities for consumers that need to interact with LLM models
   * outside of the agent builder's built-in tool/agent execution flow.
   */
  runtime: RuntimeStart;
  /**
   * Conversations service (read-only), to list and retrieve conversations.
   */
  conversations: ConversationsStart;
  /**
   * SML service, to search, fetch, and index Shared Memory Layer content.
   *
   * Not yet consumed anywhere — `sml_search.ts`/`sml_attach.ts` still call the
   * older `agentContextLayer` start contract. This is a parallel,
   * independently-tested path that a future PR will cut consumers over to.
   */
  smlService: AgentBuilderSmlServiceStart;
}
