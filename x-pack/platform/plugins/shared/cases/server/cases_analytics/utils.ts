/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  OWNERS,
} from '../../common/constants';
import type { Owner } from '../../common/constants/types';

const MAX_BUCKETS_LIMIT = 65535;
export async function getAllSpacesWithCases(savedObjectsClient: SavedObjectsClientContract) {
  // This is one way to get all spaces that we want for case analytics purposes.
  // The advantage of this approach is that only spaces that actually contain cases are selected .
  // In turn that means that no unnecessary indices are created.
  // The disadvantage is that the query is an aggregation across the entire cluster and could be
  // slow in case there are many shards and a lot of cases.
  // The alternative is to query the list of all spaces in the cluster and thus creating extra
  // indices that might not be necessary.
  const spaces = await savedObjectsClient.find<
    unknown,
    {
      spaces: {
        buckets: Array<{
          key: string;
        }>;
      };
    }
  >({
    type: CASE_SAVED_OBJECT,
    page: 0,
    perPage: 0,
    namespaces: ['*'],
    aggs: {
      spaces: {
        terms: {
          // We want to make sure that we include all spaces, because `terms` aggregations
          // by default only return the top 10 results. `MAX_BUCKETS_LIMIT` is 65k.
          size: MAX_BUCKETS_LIMIT,
          field: `${CASE_SAVED_OBJECT}.namespaces`,
        },
      },
    },
  });
  return spaces.aggregations?.spaces.buckets.map((space) => space.key) ?? [];
}

/**
 * Returns the list of {spaceId, owner} pairs that have a cases-configure SO with analytics_enabled === true.
 *
 * The analytics_enabled and owner fields must be indexed in the SO mapping for this filter to work.
 * Spaces without a configure SO, or with analytics_enabled === false / undefined, are excluded.
 * Each pair is unique — two configure SOs in the same space with different owners produce two entries.
 */
export async function getSpacesWithAnalyticsEnabled(
  savedObjectsClient: SavedObjectsClientContract
): Promise<Array<{ spaceId: string; owner: Owner }>> {
  const result = await savedObjectsClient.find<{ analytics_enabled?: boolean; owner?: string }>({
    type: CASE_CONFIGURE_SAVED_OBJECT,
    perPage: MAX_DOCS_PER_PAGE,
    namespaces: ['*'],
    filter: fromKueryExpression(
      `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.analytics_enabled: true`
    ),
  });

  const seen = new Set<string>();
  const pairs: Array<{ spaceId: string; owner: Owner }> = [];
  for (const so of result.saved_objects) {
    const rawOwner = so.attributes.owner;
    const owner = OWNERS.find((o) => o === rawOwner);
    if (owner) {
      for (const ns of so.namespaces ?? []) {
        const key = `${ns}:${owner}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ spaceId: ns, owner });
        }
      }
    }
  }
  return pairs;
}
