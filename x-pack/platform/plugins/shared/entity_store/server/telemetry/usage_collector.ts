/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { EntityStoreGlobalStateOverrides } from '../domain/saved_objects/global_state/constants';
import { EntityStoreGlobalStateTypeName } from '../domain/saved_objects/global_state/types';

// Entity store usage collector. Add new fields here as needed — they all land under
// stack_stats.kibana.plugins.entity_store.* in the telemetry cluster.
//
// Querying in the kibana-core space at stack-telemetry.elastic.dev:
// FROM all-xpack-phone-home
// | WHERE `stack_stats.kibana.plugins.entity_store.legacy_global_state_doc_count` > 0
// | STATS total_legacy_clusters = COUNT_DISTINCT(cluster_uuid)
//
// TODO(legacy-config-migration): remove legacy_global_state_doc_count (and related code below) once the query above returns 0
// Code to delete when that condition is met:
//   - the legacy_global_state_doc_count field in the schema + fetch logic below
//   - global_state/legacy_defaults.ts
//   - the `defaultsVersion === 'legacy'` branch in global_state/index.ts (getWithLatestDefaults)
//   - the `defaultsVersion` field in EntityStoreGlobalStateOverrides (constants.ts)
//   - optionally: add a model version 5 data_backfill to strip `defaultsVersion` from stored docs

interface EntityStoreUsage {
  legacy_global_state_doc_count: number;
}

export const registerEntityStoreUsageCollector = (usageCollection: UsageCollectionSetup): void => {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<EntityStoreUsage>({
      type: 'entity_store',
      isReady: () => true,
      schema: {
        legacy_global_state_doc_count: {
          type: 'long',
          _meta: {
            description:
              'Number of entity store global state docs still in legacy config format (defaultsVersion !== latest). Reaches 0 when all stores have been written to at least once',
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
