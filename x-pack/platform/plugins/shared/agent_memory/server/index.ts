/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AgentMemoryPluginSetup, AgentMemoryPluginStart } from './types';

// Config lives here, not in ./plugin, so it is available to the initializer
// without loading the full plugin. This satisfies no_sync_import_from_plugin.
export { config } from './config';

export type { AgentMemoryPluginSetup, AgentMemoryPluginStart } from './types';

export const plugin: PluginInitializer<AgentMemoryPluginSetup, AgentMemoryPluginStart> = async (
  ctx: PluginInitializerContext
) => {
  const { AgentMemoryPlugin } = await import('./plugin');
  return new AgentMemoryPlugin(ctx);
};
