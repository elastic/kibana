/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { AutomaticImportV2Plugin } from './plugin';
export type { AutomaticImportV2PluginSetup, AutomaticImportV2PluginStart } from './types';
export type { DataStreamResultsFlyoutComponent } from './components/data_stream_results_flyout/types';
export { AIV2TelemetryEventType } from '../common/telemetry/types';
export type { DataStreamResponse, TaskStatus } from '../common';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AutomaticImportV2Plugin(initializerContext);
}
