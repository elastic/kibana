/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract as UsageCollection } from 'src/plugins/usage_collection/server';
import { HapiServer } from '../../../../';
import { getUsageCollector } from './get_usage_collector';

export function registerVisualizationsCollector(
  usageCollection: UsageCollection,
  server: HapiServer
): void {
  const collector = usageCollection.makeUsageCollector(getUsageCollector(server));
  usageCollection.registerCollector(collector);
}
