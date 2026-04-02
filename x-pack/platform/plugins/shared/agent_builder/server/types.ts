/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { RunToolFn, RunAgentFn } from '@kbn/agent-builder-server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CloudStart, CloudSetup } from '@kbn/cloud-plugin/server';
import type { UsageApiSetup, UsageApiStart } from '@kbn/usage-api-plugin/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { HooksServiceSetup } from '@kbn/agent-builder-server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ToolsServiceSetup, ToolRegistry } from './services/tools';
import type { AgentRegistry } from './services/agents';
import type { AttachmentServiceSetup } from './services/attachments';
import type { SkillServiceSetup } from './services/skills';
import type { SkillRegistry } from './services/skills/skill_registry';
import type { AgentExecutionService } from './services/execution';
import type { ModelProviderFactoryFn } from './services/runner/model_provider';
import type { SmlTypeDefinition, SmlIndexAttachmentParams } from './services/sml';
import type { PluginsServiceSetup, PluginRegistry } from './services/plugins';
import type { ConversationListOptions } from './services/conversation/client/types';

export interface AgentBuilderSetupDependencies {
  cloud?: CloudSetup;
  usageApi?: UsageApiSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  inference: InferenceServerSetup;
  spaces?: SpacesPluginSetup;
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetup;
  home: HomeServerPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
}

export interface AgentBuilderStartDependencies {
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  usageApi?: UsageApiStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
}

export interface AttachmentsSetup {
  /**
   * Register an attachment type to be available in agentBuilder.
   */
  registerType: AttachmentServiceSetup['registerType'];
}

export interface SkillsSetup {
  /**
   * Register a built-in skill to be available in agentBuilder.
   * Registration is synchronous; validation is deferred to start.
   */
  register: SkillServiceSetup['registerSkill'];
}

/**
 * AgentBuilder tool service's setup contract
 */
export interface ToolsSetup {
  /**
   * Register a built-in tool to be available in agentBuilder.
   */
  register: ToolsServiceSetup['register'];
}

/**
 * AgentBuilder skills service's start contract
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

/**
 * AgentBuilder tool service's start contract
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
 * AgentBuilder execution service's start contract
 */
export interface ExecutionStart {
  /**
   * Execute an agent.
   */
  executeAgent: AgentExecutionService['executeAgent'];
  /**
   * Retrieve an agent execution by its ID.
   */
  getExecution: AgentExecutionService['getExecution'];
  /**
   * Find executions matching the given filters.
   */
  findExecutions: AgentExecutionService['findExecutions'];
}

/**
 * SML (Semantic Metadata Layer) setup contract.
 */
export interface SmlSetup {
  /**
   * Register an SML type definition.
   * Solutions can register their content types to make them discoverable via SML.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

export interface PluginsSetup {
  /**
   * Register a built-in plugin to be available in agentBuilder.
   * Built-in plugins are read-only and registered programmatically by solution teams.
   */
  register: PluginsServiceSetup['register'];
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
   * SML (Semantic Metadata Layer) setup contract.
   * Used to register content types for discovery and search.
   */
  sml: SmlSetup;
}

/**
 * AgentBuilder runtime service's start contract.
 */
export interface RuntimeStart {
  /**
   * Creates a model provider for the given request context.
   * The model provider can be used to obtain a {@link ScopedModel} for use
   * with utilities like `generateEsql` from `@kbn/agent-builder-genai-utils`.
   */
  createModelProvider: ModelProviderFactoryFn;
}

/**
 * SML (Semantic Metadata Layer) start contract.
 */
export interface SmlStart {
  /**
   * Event-driven indexing API. Allows integrations to react to
   * create/update/delete events and update SML data immediately.
   */
  indexAttachment: (params: SmlIndexAttachmentParams) => Promise<void>;
}

/**
 * AgentBuilder plugins service's start contract
 */
export interface PluginsStart {
  /**
   * Return a plugin registry scoped to the current user and context.
   * The registry provides access to both built-in and persisted plugins.
   */
  getRegistry: (opts: { request: KibanaRequest }) => PluginRegistry;
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
   * SML (Semantic Metadata Layer) service, for event-driven indexing of
   * discoverable content.
   */
  sml: SmlStart;
  /**
   * Conversations service (read-only), to list and retrieve conversations.
   */
  conversations: ConversationsStart;
}
