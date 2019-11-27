/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getKibanaUsageCollector } from './get_kibana_usage_collector';
import { getOpsStatsCollector } from './get_ops_stats_collector';
import { getSettingsCollector } from './get_settings_collector';

export function registerCollectors(usageCollection, collectorsConfigs) {
  const { config } = collectorsConfigs;

  usageCollection.registerCollector(getOpsStatsCollector(usageCollection, collectorsConfigs));
  usageCollection.registerCollector(getKibanaUsageCollector(usageCollection, config));
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
}
