/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { ResourceBootstrapConfig } from './config';
import type {
  ResourceBootstrapSetup,
  ResourceBootstrapSetupDependencies,
  ResourceBootstrapStartDependencies,
} from './types';

export type { ResourceBootstrapSetup } from './types';

export const plugin: PluginInitializer<
  ResourceBootstrapSetup,
  void,
  ResourceBootstrapSetupDependencies,
  ResourceBootstrapStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<ResourceBootstrapConfig>) => {
  const { ResourceBootstrapPlugin } = await import('./plugin');
  return new ResourceBootstrapPlugin(pluginInitializerContext);
};

export { config } from './config';
