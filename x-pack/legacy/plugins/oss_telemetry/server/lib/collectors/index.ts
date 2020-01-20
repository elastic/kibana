/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerVisualizationsCollector } from './visualizations/register_usage_collector';
import { OssTelemetryStartDependencies } from '../../plugin';

export function registerCollectors(deps: OssTelemetryStartDependencies) {
  registerVisualizationsCollector(deps.usageCollection, deps.taskManager);
}
