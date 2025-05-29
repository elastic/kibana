/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

export const fetchMapping = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<IndicesGetMappingIndexMappingRecord> => {
  const mapping = await client.asCurrentUser.indices.getMapping({
    expand_wildcards: ['open'],
    index: indexName,
  });
  return mapping[indexName];
};
