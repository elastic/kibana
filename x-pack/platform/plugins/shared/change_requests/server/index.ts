/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ChangeRequestsRouteRepository } from './routes/repository';
import { ChangeRequestDoc } from './types';
import type { ChangeRequestsPluginStart } from './plugin';

const plugin = async (initContext: PluginInitializerContext) => {
  const { ChangeRequestsPlugin } = await import('./plugin');
  return new ChangeRequestsPlugin(initContext);
};

export { plugin };

export type { ChangeRequestsRouteRepository };
export type { ChangeRequestDoc };
export type { ChangeRequestsPluginStart };
