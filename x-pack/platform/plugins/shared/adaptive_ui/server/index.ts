/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AdaptiveUiConfig } from '../common/config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AdaptiveUiPluginSetup,
  AdaptiveUiPluginStart,
} from './types';

export { config } from './config';

export const plugin: PluginInitializer<
  AdaptiveUiPluginSetup,
  AdaptiveUiPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = async (initializerContext: PluginInitializerContext<AdaptiveUiConfig>) => {
  const { AdaptiveUiPlugin } = await import('./plugin');
  return new AdaptiveUiPlugin(initializerContext);
};

export type { AdaptiveUiPluginSetup, AdaptiveUiPluginStart } from './types';
