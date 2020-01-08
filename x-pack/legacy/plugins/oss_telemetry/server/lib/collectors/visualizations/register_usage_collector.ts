/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginSetupContract as TaskManagerPluginSetupContract } from '../../../../../task_manager/server/plugin';
import { getUsageCollector } from './get_usage_collector';

export function registerVisualizationsCollector(
  collectorSet: UsageCollectionSetup,
  taskManager: TaskManagerPluginSetupContract | undefined
): void {
  const collector = collectorSet.makeUsageCollector(getUsageCollector(taskManager));
  collectorSet.registerCollector(collector);
}
