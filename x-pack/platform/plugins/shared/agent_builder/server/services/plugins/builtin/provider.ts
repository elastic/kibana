/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition, UnmanagedPluginAssets } from '@kbn/agent-builder-common';
import type { BuiltInPluginDefinition } from '@kbn/agent-builder-server/plugins';
import type { BuiltinPluginRegistry } from './registry';
import type { ReadonlyPluginProvider } from '../plugin_provider';

const emptyUnmanagedAssets: UnmanagedPluginAssets = {
  commands: [],
  agents: [],
  hooks: [],
  mcp_servers: [],
  output_styles: [],
  lsp_servers: [],
};

export const createBuiltinPluginProvider = ({
  registry,
}: {
  registry: BuiltinPluginRegistry;
}): ReadonlyPluginProvider => {
  return {
    id: 'builtin',
    readonly: true,
    has: (pluginId: string) => registry.has(pluginId),
    get: (pluginId: string) => {
      const definition = registry.get(pluginId);
      return definition ? toPluginDefinition(definition) : undefined;
    },
    findByName: (name: string) => {
      const definition = registry.findByName(name);
      return definition ? toPluginDefinition(definition) : undefined;
    },
    list: () => registry.list().map(toPluginDefinition),
  };
};

const toPluginDefinition = (definition: BuiltInPluginDefinition): PluginDefinition => ({
  id: definition.id,
  name: definition.name,
  version: definition.version,
  description: definition.description,
  readonly: true,
  manifest: definition.manifest ?? {},
  skill_ids: (definition.skills ?? []).map((s) => s.id),
  unmanaged_assets: emptyUnmanagedAssets,
  created_at: '',
  updated_at: '',
});
