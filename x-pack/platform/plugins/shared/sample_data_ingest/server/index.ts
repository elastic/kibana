/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { SampleDataStartDependencies, SampleDataSetupDependencies } from './types';
import type { SampleDataIngestConfig } from './config';
export { config } from './config';

export const plugin: PluginInitializer<
  SampleDataStartDependencies,
  SampleDataSetupDependencies
> = async (pluginInitializerContext: PluginInitializerContext<SampleDataIngestConfig>) => {
  const { SampleDataIngestPlugin } = await import('./plugin');

  return new SampleDataIngestPlugin(pluginInitializerContext);
};
