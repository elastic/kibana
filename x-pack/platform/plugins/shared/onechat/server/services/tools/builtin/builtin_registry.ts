/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateToolId } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

export interface BuiltinToolRegistry {
  register(tool: BuiltinToolDefinition<any>): void;
  has(toolId: string): boolean;
  get(toolId: string): BuiltinToolDefinition | undefined;
  list(): BuiltinToolDefinition[];
}

export const createBuiltinToolRegistry = (): BuiltinToolRegistry => {
  return new BuiltinToolRegistryImpl();
};

class BuiltinToolRegistryImpl implements BuiltinToolRegistry {
  private tools: Map<string, BuiltinToolDefinition> = new Map();

  constructor() {}

  register(tool: BuiltinToolDefinition) {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id ${tool.id} already registered`);
    }
    const errorMessage = validateToolId({ toolId: tool.id, builtIn: true });
    if (errorMessage) {
      throw new Error(`Invalid tool id: "${tool.id}": ${errorMessage}`);
    }
    this.tools.set(tool.id, tool);
  }

  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  get(toolId: string) {
    return this.tools.get(toolId);
  }

  list() {
    return [...this.tools.values()];
  }
}
