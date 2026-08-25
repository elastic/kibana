/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '@kbn/core/server';
import type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart } from './plugin';

export type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart };

export type {
  LogsRatesMetrics,
  LogsRatesServiceReturnType,
} from './services/get_logs_rates_service';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { LogsDataAccessPlugin } = await import('./plugin');
  return new LogsDataAccessPlugin(initializerContext);
}
