/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentRegistry } from './agent_registry';
import type { AgentsUsingToolsResult } from './persisted/types';

export interface AgentsServiceSetup {
  register(agent: BuiltInAgentDefinition): void;
}

export interface ToolRefsParams {
  request: KibanaRequest;
  toolIds: string[];
}

export interface AgentsServiceStart {
  execute: RunAgentFn;
  getRegistry: (opts: { request: KibanaRequest }) => Promise<AgentRegistry>;
  removeToolRefsFromAgents: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
  getAgentsUsingTools: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
}
