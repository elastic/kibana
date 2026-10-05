/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { EsqlViewsServerPlugin } from './plugin';

export { config } from './config';
export type { EsqlViewsConfig } from './config';

export const plugin = async (
  _initializerContext: PluginInitializerContext
): Promise<EsqlViewsServerPlugin> => {
  const { EsqlViewsServerPlugin: Plugin } = await import('./plugin');
  return new Plugin();
};
