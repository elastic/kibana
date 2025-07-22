/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config_schema';

export async function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  const { AiopsPlugin } = await import('./plugin');
  return new AiopsPlugin(initializerContext);
}

export type { AiopsPluginSetup, AiopsPluginStart } from './types';

export { config, type ConfigSchema } from './config_schema';
