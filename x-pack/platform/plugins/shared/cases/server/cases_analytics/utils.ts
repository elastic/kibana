/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_CONFIGURE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../common/constants';
import { OWNERS } from '../../common/constants/owners';
import type { Owner } from '../../common/constants/types';
import type { ConfigurationPersistedAttributes } from '../common/types/configure';

export interface OwnerSpacePair {
  spaceId: string;
  owner: Owner;
}

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

export async function getSpacesWithAnalyticsEnabled(
  savedObjectsClient: SavedObjectsClientContract
): Promise<OwnerSpacePair[]> {
  const result = await savedObjectsClient.find<ConfigurationPersistedAttributes>({
    type: CASE_CONFIGURE_SAVED_OBJECT,
    namespaces: ['*'],
    filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.analytics_enabled: true`,
    page: 1,
    perPage: 10000,
  });

  const seen = new Set<string>();
  const pairs: OwnerSpacePair[] = [];

  for (const so of result.saved_objects) {
    const owner = so.attributes.owner as Owner;
    if (OWNERS.includes(owner as (typeof OWNERS)[number])) {
      const spaces = (so.namespaces ?? []).filter((ns) => ns !== '*');
      for (const spaceId of spaces) {
        const key = `${spaceId}:${owner}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ spaceId, owner });
        }
      }
    }
  }

  return pairs;
}
