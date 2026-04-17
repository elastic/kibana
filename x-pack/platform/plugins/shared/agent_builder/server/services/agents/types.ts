/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentRegistry } from './agent_registry';
import type { AgentsUsingSkillsResult, AgentsUsingToolsResult } from './persisted/types';

export interface AgentsServiceSetup {
  register(agent: BuiltInAgentDefinition): void;
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
  removeToolRefsFromAgents: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
  getAgentsUsingTools: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
  removePluginRefsFromAgents: (params: PluginRefsParams) => Promise<AgentsUsingToolsResult>;
  getAgentsUsingPlugins: (params: PluginRefsParams) => Promise<AgentsUsingToolsResult>;
  removeSkillRefsFromAgents: (params: SkillRefsParams) => Promise<AgentsUsingSkillsResult>;
  getAgentsUsingSkills: (params: SkillRefsParams) => Promise<AgentsUsingSkillsResult>;
}
