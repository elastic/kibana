/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { EntityStoreGlobalStateOverrides } from '../domain/saved_objects/global_state/constants';
import { EntityStoreGlobalStateTypeName } from '../domain/saved_objects/global_state/types';

// TODO(legacy-config-migration): remove this entire collector and the code listed below once
// legacy_global_state_doc_count has been consistently 0 across the fleet for two major versions
// (signal: no non-zero reports in usage data for the past two releases).
//
// Code to delete when that condition is met:
//   - this file + its registration in plugin.ts
//   - global_state/legacy_defaults.ts
//   - the `defaultsVersion === 'legacy'` branch in global_state/index.ts (getWithLatestDefaults)
//   - the `defaultsVersion` field in EntityStoreGlobalStateOverrides (constants.ts)
//   - optionally: add a model version 5 data_backfill to strip `defaultsVersion` from stored docs;

interface EntityStoreUsage {
  legacy_global_state_doc_count: number;
}

export const registerUsageCollector = (usageCollection: UsageCollectionSetup): void => {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<EntityStoreUsage>({
      type: 'entity_store',
      isReady: () => true,
      schema: {
        legacy_global_state_doc_count: {
          type: 'long',
          _meta: {
            description:
              'Number of entity store global state docs still in legacy config format (defaultsVersion !== latest). Reaches 0 when all stores have been written to at least once after the 10.4 upgrade.',
          },
        },
      },
      fetch: async ({ soClient }) => {
        const result = await soClient.find<EntityStoreGlobalStateOverrides>({
          type: EntityStoreGlobalStateTypeName,
          namespaces: ['*'],
          perPage: 10_000,
        });
        const legacyCount = result.saved_objects.filter(
          (so) => so.attributes.defaultsVersion !== 'latest'
        ).length;
        return { legacy_global_state_doc_count: legacyCount };
      },
    })
  );
};
