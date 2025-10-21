/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentKnowledge } from '@kbn/onechat-server/agents';

export interface AgentKnowledgeRegistry {
  register(agent: AgentKnowledge): void;
  has(agentId: string): boolean;
  get(agentId: string): AgentKnowledge | undefined;
  list(): AgentKnowledge[];
}

export const createAgentKnowledgeRegistry = (): AgentKnowledgeRegistry => {
  return new AgentKnowledgeRegistryImpl();
};

class AgentKnowledgeRegistryImpl implements AgentKnowledgeRegistry {
  private entries: Map<string, AgentKnowledge> = new Map();

  constructor() {}

  register(knowledge: AgentKnowledge) {
    if (this.entries.has(knowledge.id)) {
      throw new Error(`Agent knowledge with id ${knowledge.id} already registered`);
    }
    this.entries.set(knowledge.id, knowledge);
  }

  has(knowledgeId: string): boolean {
    return this.entries.has(knowledgeId);
  }

  get(knowledgeId: string) {
    return this.entries.get(knowledgeId);
  }

  list() {
    return [...this.entries.values()];
  }
}
