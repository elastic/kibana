/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsStringTermsBucketKeys,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PAGE_SIZE } from './constants';
import type { SavedObjectTypesToQuery } from './run_invalidate';

interface QueryForApiKeysInUseOpts {
  apiKeyIds: string[];
  savedObjectTypeToQuery: SavedObjectTypesToQuery;
  savedObjectsClient: SavedObjectsClientContract;
}

export async function queryForApiKeysInUse(
  opts: QueryForApiKeysInUseOpts
): Promise<AggregationsStringTermsBucketKeys[]> {
  const { apiKeyIds, savedObjectTypeToQuery, savedObjectsClient } = opts;
  const filter = `${apiKeyIds
    .map((apiKeyId) => `${savedObjectTypeToQuery.apiKeyAttributePath}: "${apiKeyId}"`)
    .join(' OR ')}`;

  const { aggregations } = await savedObjectsClient.find<
    unknown,
    { apiKeyId: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys> }
  >({
    type: savedObjectTypeToQuery.type,
    filter,
    perPage: 0,
    namespaces: ['*'],
    aggs: {
      apiKeyId: {
        terms: {
          field: `${savedObjectTypeToQuery.apiKeyAttributePath}`,
          size: PAGE_SIZE,
        },
      },
    },
  });

  return (aggregations?.apiKeyId?.buckets as AggregationsStringTermsBucketKeys[]) ?? [];
}
