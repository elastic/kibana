/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RunToolFn, RunAgentFn } from '@kbn/agent-builder-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CloudStart, CloudSetup } from '@kbn/cloud-plugin/server';
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
import type { ToolsServiceSetup, ToolRegistry } from './services/tools';
import type { AttachmentServiceSetup } from './services/attachments';
import type { SkillServiceSetup } from './services/skills';

export interface AgentBuilderSetupDependencies {
  cloud?: CloudSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  inference: InferenceServerSetup;
  spaces?: SpacesPluginSetup;
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetup;
  home: HomeServerPluginSetup;
}

export interface AgentBuilderStartDependencies {
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
}

export interface AttachmentsSetup {
  /**
   * Register an attachment type to be available in agentBuilder.
   */
  registerType: AttachmentServiceSetup['registerType'];
}

export interface SkillsSetup {
  /**
   * Register a skill to be available in agentBuilder.
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
}

/**
 * Start contract of the agentBuilder plugin.
 */
export interface AgentBuilderPluginStart {
  /**
   * Agents service, to execute agents.
   */
  agents: {
    runAgent: RunAgentFn;
  };
  /**
   * Tools service, to manage or execute tools.
   */
  tools: ToolsStart;
}
