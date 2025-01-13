/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getSettingsCollector } from './get_settings_collector';
import { getMonitoringUsageCollector } from './get_usage_collector';
import { MonitoringConfig } from '../../config';

export type { KibanaSettingsCollector } from './get_settings_collector';
export { getKibanaSettings } from './get_settings_collector';

export function registerCollectors(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  getClient: () => IClusterClient
) {
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
  usageCollection.registerCollector(
    getMonitoringUsageCollector(usageCollection, config, getClient)
  );
}
