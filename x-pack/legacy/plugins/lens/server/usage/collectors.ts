/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { getVisualizationCounts } from './visualization_counts';
import { LensUsage } from './types';

export function registerLensUsageCollector(
  core: CoreSetup,
  plugins: {
    savedObjects: SavedObjectsLegacyService;
    usage: {
      collectorSet: {
        makeUsageCollector: (options: unknown) => unknown;
        register: (options: unknown) => unknown;
      };
    };
    config: KibanaConfig;
  }
) {
  const lensUsageCollector = plugins.usage.collectorSet.makeUsageCollector({
    type: 'lens',
    fetch: async (callCluster: CallCluster): Promise<LensUsage> => {
      try {
        return getVisualizationCounts(callCluster, plugins.config);
      } catch (err) {
        return {
          saved_total: 0,
          saved_last_30_days: 0,
          saved_last_90_days: 0,
          visualization_types_overall: {},
          visualization_types_last_30_days: {},
          visualization_types_last_90_days: {},
        };
      }
    },
    isReady: () => true,
  });
  plugins.usage.collectorSet.register(lensUsageCollector);
}
