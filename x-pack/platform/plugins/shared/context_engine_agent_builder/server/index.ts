/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { ContextEngineAgentBuilderConfig } from './config';
import type {
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderSetupDependencies,
  ContextEngineAgentBuilderStartDependencies,
} from './types';

export { config } from './config';

export type {
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
} from './types';

export const plugin: PluginInitializer<
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderSetupDependencies,
  ContextEngineAgentBuilderStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<ContextEngineAgentBuilderConfig>) => {
  const { ContextEngineAgentBuilderPlugin } = await import('./plugin');
  return new ContextEngineAgentBuilderPlugin(pluginInitializerContext);
};
