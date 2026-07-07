/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginClient } from '../client';
import { toPluginDefinition } from '../client';
import type { WritablePluginProvider } from '../plugin_provider';

export const createPersistedPluginProvider = ({
  client,
}: {
  client: PluginClient;
}): WritablePluginProvider => {
  return {
    id: 'persisted',
    readonly: false,
    has: (pluginId) => client.has(pluginId),
    get: async (pluginId) => {
      if (!(await client.has(pluginId))) {
        return undefined;
      }
      return toPluginDefinition(await client.get(pluginId));
    },
    findByName: async (name) => {
      const found = await client.findByName(name);
      return found ? toPluginDefinition(found) : undefined;
    },
    list: async () => {
      const plugins = await client.list();
      return plugins.map(toPluginDefinition);
    },
    create: async (request) => toPluginDefinition(await client.create(request)),
    update: async (pluginId, update) => toPluginDefinition(await client.update(pluginId, update)),
    delete: (pluginId) => client.delete(pluginId),
  };
};
