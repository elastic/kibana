/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../../common';

import { getPackagePolicySavedObjectType } from '../package_policy';

/**
 * The number of package policies of each package, by package name, and how many of them a cloud
 * onboarding instance manages.
 */
export async function getPackagePoliciesCountByPackageName(
  soClient: SavedObjectsClientContract
): Promise<Record<string, { count: number; onboardingManagedCount: number }>> {
  const savedObjectType = await getPackagePolicySavedObjectType();

  const res = await soClient.find<
    any,
    {
      count_by_package_name: {
        buckets: Array<{
          key: string;
          doc_count: number;
          onboarding_managed: { doc_count: number };
        }>;
      };
    }
  >({
    type: savedObjectType,
    perPage: 0,
    // Query across all spaces so the count reflects cluster-wide usage, not
    // just the current space. Required because the caller uses a client with
    // the Spaces extension excluded; without an explicit namespaces value
    // Core defaults to ['default'] rather than all spaces.
    namespaces: ['*'],
    // Use NOT false instead of :true so that policies without the field
    // (8.x policies where latest_revision was never persisted to ES) are
    // treated as current revisions and included in the count.
    filter: `NOT ${savedObjectType}.attributes.latest_revision:false`,
    aggs: {
      count_by_package_name: {
        terms: {
          field: `${savedObjectType}.attributes.package.name`,
          // Without an explicit size, ES defaults to 10 buckets and silently
          // truncates results when more than 10 distinct package names exist.
          size: SO_SEARCH_LIMIT,
        },
        aggs: {
          onboarding_managed: {
            filter: {
              exists: { field: `${savedObjectType}.attributes.onboarding_deployment_id` },
            },
          },
        },
      },
    },
  });

  return Object.fromEntries(
    (res.aggregations?.count_by_package_name.buckets ?? []).map((bucket) => [
      bucket.key,
      { count: bucket.doc_count, onboardingManagedCount: bucket.onboarding_managed.doc_count },
    ])
  );
}
