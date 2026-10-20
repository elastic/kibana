/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentTypeDefinition, AgentTypeRegistry } from '@kbn/agent-builder-server/agents';
import { isAllowedAgentType } from '@kbn/agent-builder-server/allow_lists';

export const createAgentTypeRegistry = (): AgentTypeRegistry => {
  return new AgentTypeRegistryImpl();
};

class AgentTypeRegistryImpl implements AgentTypeRegistry {
  private types: Map<string, AgentTypeDefinition> = new Map();

  register(type: AgentTypeDefinition) {
    if (this.types.has(type.id)) {
      throw new Error(`Agent type with id ${type.id} already registered`);
    }
    if (!isAllowedAgentType(type.id)) {
      throw new Error(`Agent type with id "${type.id}" is not in the list of allowed agent types.
             Please add it to the list of allowed agent types in the "@kbn/agent-builder-server/allow_lists.ts" file.`);
    }
    this.types.set(type.id, type);
  }

  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  get(typeId: string) {
    return this.types.get(typeId);
  }

  list() {
    return [...this.types.values()];
  }
}
