/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition } from '@kbn/agent-builder-common';
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
    get: async (pluginId) =>
      toPersistedPluginDefinition(toPluginDefinition(await client.get(pluginId))),
    list: async () => {
      const plugins = await client.list();
      return plugins.map((p) => toPersistedPluginDefinition(toPluginDefinition(p)));
    },
    create: async (request) =>
      toPersistedPluginDefinition(toPluginDefinition(await client.create(request))),
    update: async (pluginId, update) =>
      toPersistedPluginDefinition(toPluginDefinition(await client.update(pluginId, update))),
    delete: (pluginId) => client.delete(pluginId),
  };
};

const toPersistedPluginDefinition = (definition: PluginDefinition): PluginDefinition => ({
  ...definition,
  readonly: false,
});
