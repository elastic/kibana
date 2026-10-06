/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObjectTypesToQuery } from './run_invalidate';
interface QueryForApiKeysInUseOpts {
  apiKeyIds: string[];
  savedObjectTypeToQuery: SavedObjectTypesToQuery;
  savedObjectsClient: SavedObjectsClientContract;
}
export declare function queryForApiKeysInUse(
  opts: QueryForApiKeysInUseOpts
): Promise<AggregationsStringTermsBucketKeys[]>;
export {};
