/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { LogsDataAccessConfig } from './config';
import { configSchema } from './config';
import type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart } from './plugin';

export type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart };

// Not exposed to the browser: the rerank inference id is only ever used server-side.
export const config: PluginConfigDescriptor<LogsDataAccessConfig> = {
  schema: configSchema,
};

export type {
  LogsRatesMetrics,
  LogsRatesServiceReturnType,
} from './services/get_logs_rates_service';

export type {
  LogPattern,
  SemanticLogSearchService,
  SemanticLogSearchParams,
  SearchDiagnostics,
  SemanticLogSearchResult,
  TimeRange,
} from '../common/services/semantic_log_search/types';

export type {
  SearchStatus,
  UnavailableReason,
  ErrorReason,
} from '../common/services/semantic_log_search/constants';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { LogsDataAccessPlugin } = await import('./plugin');
  return new LogsDataAccessPlugin(initializerContext);
}
