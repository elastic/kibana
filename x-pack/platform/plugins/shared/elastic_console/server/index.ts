/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ElasticConsoleConfig } from './config';
import { configSchema } from './config';
import { ElasticConsolePlugin } from './plugin';
import { ELASTIC_CONSOLE_ENABLED_FLAG } from '../common/feature_flags';

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: ELASTIC_CONSOLE_ENABLED_FLAG,
    name: 'Elastic Ramen',
    description: 'Enables the Elastic Ramen plugin and its API routes (experimental)',
    tags: ['elastic-console'],
    variationType: 'boolean',
    variations: [
      { name: 'Enabled', description: 'Plugin is enabled', value: true },
      { name: 'Disabled', description: 'Plugin is disabled', value: false },
    ],
  },
];

export const plugin = async (pluginInitializerContext: PluginInitializerContext) =>
  new ElasticConsolePlugin(pluginInitializerContext);

export const config: PluginConfigDescriptor<ElasticConsoleConfig> = {
  schema: configSchema,
};
