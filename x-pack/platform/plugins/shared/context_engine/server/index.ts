/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';

export type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  WorkflowsManagementApiLike,
} from './types';

/**
 * Server half of the Agent Builder hand-off bridge, called from `agent_builder_platform`'s
 * `setup()`. Registers only the `ai_index` attachment + its read tool (no agent, no skills).
 * Safe to export here: `./agent_builder` never imports `./plugin`.
 */
export { registerContextEngineAgentBuilder } from './agent_builder';

export const plugin: PluginInitializer<
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { ContextEnginePlugin } = await import('./plugin');
  return new ContextEnginePlugin(pluginInitializerContext);
};
