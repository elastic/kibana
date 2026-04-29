/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetup, StreamsPluginStart } from './plugin';
import { config } from './plugin';
import type { StreamsRouteRepository } from './routes';

export type { StreamsConfig, StreamsPluginSetup, StreamsPluginStart, StreamsRouteRepository };
export { config };

export const plugin = async (context: PluginInitializerContext<StreamsConfig>) => {
  const { StreamsPlugin } = await import('./plugin');
  return new StreamsPlugin(context);
};
