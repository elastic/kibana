/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema } from './config';

export type { MonitoringCollectionConfig } from './config';

export type { MonitoringCollectionSetup, MetricResult, Metric } from './plugin';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { MonitoringCollectionPlugin } = await import('./plugin');
  return new MonitoringCollectionPlugin(initContext);
};
export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
};
