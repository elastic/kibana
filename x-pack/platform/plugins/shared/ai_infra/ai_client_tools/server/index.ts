/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AIClientToolsBaseConfig } from './config';
import type {
  AIClientToolsBaseSetupContract,
  AIClientToolsBaseStartContract,
  AIClientToolsBaseSetupDependencies,
  AIClientToolsBaseStartDependencies,
} from './types';
import { AIClientToolsBasePlugin } from './plugin';

export { config } from './config';

export type { AIClientToolsBaseSetupContract, AIClientToolsBaseStartContract };
export { mapToolToServerSideSecuritySolutionTool } from './adapters';

export const plugin: PluginInitializer<
  AIClientToolsBaseSetupContract,
  AIClientToolsBaseStartContract,
  AIClientToolsBaseSetupDependencies,
  AIClientToolsBaseStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<AIClientToolsBaseConfig>) => {
  return new AIClientToolsBasePlugin(pluginInitializerContext);
};
