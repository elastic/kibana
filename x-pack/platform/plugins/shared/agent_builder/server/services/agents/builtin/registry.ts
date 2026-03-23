/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateAgentId } from '@kbn/agent-builder-common/agents';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';

export interface BuiltinAgentRegistry {
  register(agent: BuiltInAgentDefinition): void;
  has(agentId: string): boolean;
  get(agentId: string): BuiltInAgentDefinition | undefined;
  list(): BuiltInAgentDefinition[];
}

export const createBuiltinAgentRegistry = (): BuiltinAgentRegistry => {
  return new BuiltinAgentRegistryImpl();
};

class BuiltinAgentRegistryImpl implements BuiltinAgentRegistry {
  private agents: Map<string, BuiltInAgentDefinition> = new Map();

  constructor() {}

  register(agent: BuiltInAgentDefinition) {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} already registered`);
    }
    const errorMessage = validateAgentId({ agentId: agent.id, builtIn: true });
    if (errorMessage) {
      throw new Error(`Invalid agent id: "${agent.id}": ${errorMessage}`);
    }
    this.agents.set(agent.id, agent);
  }

  has(toolId: string): boolean {
    return this.agents.has(toolId);
  }

  get(toolId: string) {
    return this.agents.get(toolId);
  }

  list() {
    return [...this.agents.values()];
  }
}
