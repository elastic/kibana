/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { getPackagePolicySavedObjectType } from '../package_policy';

export async function getPackagePoliciesCountByPackageName(soClient: SavedObjectsClientContract) {
  const savedObjectType = await getPackagePolicySavedObjectType();

  const res = await soClient.find<
    any,
    { count_by_package_name: { buckets: Array<{ key: string; doc_count: number }> } }
  >({
    type: savedObjectType,
    perPage: 0,
    aggs: {
      count_by_package_name: {
        terms: {
          field: `${savedObjectType}.attributes.package.name`,
        },
      },
    },
  });

  return (
    res.aggregations?.count_by_package_name.buckets.reduce((acc, bucket) => {
      acc[bucket.key] = bucket.doc_count;

      return acc;
    }, {} as { [k: string]: number }) ?? {}
  );
}
