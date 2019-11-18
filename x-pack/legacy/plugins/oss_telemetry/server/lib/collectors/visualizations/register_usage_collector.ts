/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract as TaskManagerPluginSetupContract } from '../../../../../task_manager/plugin';
import { getUsageCollector } from './get_usage_collector';
import { OssTelemetrySetupDependencies } from '../../../plugin';

export function registerVisualizationsCollector(
  {
    makeUsageCollector,
    register,
  }: OssTelemetrySetupDependencies['__LEGACY']['telemetry']['collectorSet'],
  taskManager: TaskManagerPluginSetupContract | undefined
): void {
  const collector = makeUsageCollector(getUsageCollector(taskManager));
  register(collector);
}
