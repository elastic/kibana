/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TaskManagerStartContract } from '../../../../../../../plugins/task_manager/server';
import { getUsageCollector } from './get_usage_collector';

export function registerVisualizationsCollector(
  collectorSet: UsageCollectionSetup,
  taskManager?: TaskManagerStartContract
): void {
  const collector = collectorSet.makeUsageCollector(getUsageCollector(taskManager));
  collectorSet.registerCollector(collector);
}
