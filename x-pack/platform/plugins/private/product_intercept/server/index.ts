/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { type ConfigSchema, configSchema } from '../common/config';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { ProductInterceptServerPlugin } = await import('./plugin');
  return new ProductInterceptServerPlugin(initContext);
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: { enabled: true },
  schema: configSchema,
};
