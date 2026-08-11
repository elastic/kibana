/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  BuiltInAgentDefinition,
  AgentTypeDefinition,
  AgentAvailabilityConfig,
  AgentBaseConfiguration,
} from '@kbn/agent-builder-server/agents';
import type {
  AgentConfiguration,
  AgentCreateRequest,
  AgentDefinition,
} from '@kbn/agent-builder-common';
import type { AgentRegistry } from './agent_registry';
import type { AgentsUsingSkillsResult, AgentsUsingToolsResult } from './persisted/types';

export interface AgentsServiceSetup {
  register(agent: BuiltInAgentDefinition): void;
  registerType(type: AgentTypeDefinition): void;
}

export interface ToolRefsParams {
  request: KibanaRequest;
  toolIds: string[];
}

export interface PluginRefsParams {
  request: KibanaRequest;
  pluginIds: string[];
  skillIds?: string[];
}

export interface SkillRefsParams {
  request: KibanaRequest;
  skillIds: string[];
}

export interface AgentsServiceStart {
  getRegistry: (opts: { request: KibanaRequest }) => Promise<AgentRegistry>;
  ensure: (opts: {
    spaceId: string;
    agent: AgentCreateRequest;
    availability?: AgentAvailabilityConfig;
  }) => Promise<void>;
  resolveAgentConfiguration: (opts: {
    agent: AgentDefinition;
    request: KibanaRequest;
  }) => Promise<AgentConfiguration>;
  /**
   * Resolves only the base configuration contributed by the agent's type, without merging the
   * agent's own configuration into it. Callers that need to tell the two apart cannot use
   * {@link AgentsServiceStart.resolveAgentConfiguration}, since the merge unions them.
   *
   * Resolves to `undefined` when the agent's type is not registered. Unlike the execution path,
   * this does not fall back to the `chat` type: reporting another type's configuration as the
   * agent's own would be a guess presented as fact.
   */
  resolveAgentBaseConfiguration: (opts: {
    agent: Pick<AgentDefinition, 'type'>;
    request: KibanaRequest;
  }) => Promise<AgentBaseConfiguration | undefined>;
  removeToolRefsFromAgents: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
  getAgentsUsingTools: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
  removePluginRefsFromAgents: (params: PluginRefsParams) => Promise<AgentsUsingToolsResult>;
  getAgentsUsingPlugins: (params: PluginRefsParams) => Promise<AgentsUsingToolsResult>;
  removeSkillRefsFromAgents: (params: SkillRefsParams) => Promise<AgentsUsingSkillsResult>;
  getAgentsUsingSkills: (params: SkillRefsParams) => Promise<AgentsUsingSkillsResult>;
}
