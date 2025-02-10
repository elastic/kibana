/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { DatasetQualityConfig } from '../common/plugin_config';
import { DatasetQualityPlugin } from './plugin';

export type { DataStreamStatServiceResponse } from '../common/data_streams_stats';
export type { DatasetQualityPluginSetup, DatasetQualityPluginStart } from './types';

export { DataStreamsStatsService } from './services/data_streams_stats/data_streams_stats_service';
export type { IDataStreamsStatsClient } from './services/data_streams_stats/types';

export function plugin(context: PluginInitializerContext<DatasetQualityConfig>) {
  return new DatasetQualityPlugin(context);
}
