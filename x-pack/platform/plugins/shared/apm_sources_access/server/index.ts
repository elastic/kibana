/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart } from './plugin';
import { config } from './config';
import { configSchema, type APMDataAccessConfig, type APMIndices } from '../common/config_schema';

const plugin = async (initContext: PluginInitializerContext) => {
  const { ApmSourcesAccessPlugin } = await import('./plugin');
  return new ApmSourcesAccessPlugin(initContext);
};

export type {
  APMIndices,
  APMDataAccessConfig,
  ApmSourcesAccessPluginSetup,
  ApmSourcesAccessPluginStart,
};
export { configSchema, config, plugin };
