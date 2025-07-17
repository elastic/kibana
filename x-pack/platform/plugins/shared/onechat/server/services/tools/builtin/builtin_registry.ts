/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { isBuiltinToolId } from '../utils';

export interface BuiltinToolRegistry {
  register(tool: BuiltinToolDefinition<any, any>): void;
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
    if (!isBuiltinToolId(tool.id)) {
      throw new Error(
        `Invalid id: "${tool.id}". Built-in tool ids must start with a dot and only contains alphanumeric characters, hyphens, and underscores.`
      );
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
