/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsLegacyService } from 'kibana/server';
import { ActionsUsage } from './types';

interface Config {
  isActionsEnabled: boolean;
}

function getSavedObjectsClient(callCluster: CallCluster, savedObjects: SavedObjectsLegacyService) {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const internalRepository = getSavedObjectsRepository(callCluster);
  return new SavedObjectsClient(internalRepository);
}

async function getTotalCount(savedObjectsClient: any) {
  const findResult = await savedObjectsClient.find({
    // ...options,
    type: 'action',
  });

  return findResult.total;
}

export function createActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: Config,
  savedObjects: any
) {
  const { isActionsEnabled } = config;
  return usageCollection.makeUsageCollector({
    type: 'actions',
    isReady: () => true,
    fetch: async (callCluster: CallCluster): Promise<ActionsUsage> => {
      const savedObjectsClient = getSavedObjectsClient(callCluster, savedObjects);
      return {
        enabled: isActionsEnabled,
        count_total: await getTotalCount(savedObjectsClient),
        count_active_total: 0,
        executions_total: 0,
        count_active_by_type: { sd: 0 },
        count_by_type: { sd: 0 },
        executions_by_type: { sd: 0 },
      };
    },
  });
}

export function registerActionsUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  savedObjects: SavedObjectsLegacyService,
  config: Config
) {
  if (!usageCollection) {
    return;
  }

  const collector = createActionsUsageCollector(usageCollection, config, savedObjects);
  usageCollection.registerCollector(collector);
}
