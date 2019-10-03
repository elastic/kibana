/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { getVisualizationCounts } from './visualization_counts';

export function getSavedObjectsClient(
  savedObjects: SavedObjectsLegacyService,
  callAsInternalUser: unknown
) {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const internalRepository = getSavedObjectsRepository(callAsInternalUser);
  return new SavedObjectsClient(internalRepository);
}

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
  }
) {
  const lensUsageCollector = plugins.usage.collectorSet.makeUsageCollector({
    type: 'lens',
    fetch: async (callCluster: CallCluster) => {
      const savedObjectsClient = getSavedObjectsClient(plugins.savedObjects, callCluster);
      try {
        return getVisualizationCounts(savedObjectsClient);
      } catch (err) {
        return {
          lens: {
            total: 0,
            visualization_types: {},
          },
        };
      }
    },
    isReady: () => true,
  });
  plugins.usage.collectorSet.register(lensUsageCollector);
}
