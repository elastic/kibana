/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginInitializer,
  PluginInitializerContext,
  PluginConfigDescriptor,
} from '@kbn/core/server';
import { DataUsageConfigType } from './config';

import { DataUsagePlugin } from './plugin';
import type {
  DataUsageServerSetup,
  DataUsageServerStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies,
} from './types';

import { configSchema } from './config';

export type { DataUsageServerSetup, DataUsageServerStart };

export const config: PluginConfigDescriptor<DataUsageConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    enableExperimental: true,
  },
};

export const plugin: PluginInitializer<
  DataUsageServerSetup,
  DataUsageServerStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<DataUsageConfigType>) =>
  await new DataUsagePlugin(pluginInitializerContext);
