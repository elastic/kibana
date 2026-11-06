/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import type { SearchBoostConfigType } from './config';
import { configSchema } from './config';
import type { SearchBoostSetupDependencies } from './types';

export const config: PluginConfigDescriptor<SearchBoostConfigType> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<void, void, SearchBoostSetupDependencies> = async () => {
  const { SearchBoostPlugin } = await import('./plugin');
  return new SearchBoostPlugin();
};
