/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RunAgentFn } from '@kbn/onechat-server';
import type { BuiltInAgentDefinition, AgentKnowledge } from '@kbn/onechat-server/agents';
import type { AgentRegistry } from './agent_registry';
import type { AgentKnowledgeRegistry } from './knowledge_registry';

export interface AgentsServiceSetup {
  register(agent: BuiltInAgentDefinition): void;
  registerKnowledge(knowledge: AgentKnowledge): void;
}

export interface AgentsServiceStart {
  execute: RunAgentFn;
  getRegistry: (opts: { request: KibanaRequest }) => Promise<AgentRegistry>;
  getKnowledgeRegistry: () => Promise<AgentKnowledgeRegistry>;
}
