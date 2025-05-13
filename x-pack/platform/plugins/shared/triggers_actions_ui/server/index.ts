/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import { configSchema } from './config';

export type { PluginStartContract } from './plugin';
export type { TimeSeriesQuery } from './data';
export { DEFAULT_GROUPS, TIME_SERIES_BUCKET_SELECTOR_FIELD } from './data';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    rules: {
      enabled: true,
    },
    enableGeoTrackingThresholdAlert: true,
    enableExperimental: true,
  },
  schema: configSchema,
};

export const plugin = async (ctx: PluginInitializerContext) => {
  const { TriggersActionsPlugin } = await import('./plugin');
  return new TriggersActionsPlugin(ctx);
};
