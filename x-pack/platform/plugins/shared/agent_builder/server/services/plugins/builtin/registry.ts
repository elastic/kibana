/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInPluginDefinition } from '@kbn/agent-builder-server/plugins';

export interface BuiltinPluginRegistry {
  register(plugin: BuiltInPluginDefinition): void;
  has(pluginId: string): boolean;
  get(pluginId: string): BuiltInPluginDefinition | undefined;
  list(): BuiltInPluginDefinition[];
}

export const createBuiltinPluginRegistry = (): BuiltinPluginRegistry => {
  return new BuiltinPluginRegistryImpl();
};

class BuiltinPluginRegistryImpl implements BuiltinPluginRegistry {
  private plugins: Map<string, BuiltInPluginDefinition> = new Map();

  register(plugin: BuiltInPluginDefinition) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id ${plugin.id} already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  get(pluginId: string) {
    return this.plugins.get(pluginId);
  }

  list() {
    return [...this.plugins.values()];
  }
}
