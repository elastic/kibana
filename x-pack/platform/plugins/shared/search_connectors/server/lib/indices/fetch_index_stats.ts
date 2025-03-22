/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/types';

import { IScopedClusterClient } from '@kbn/core/server';

export const fetchIndexStats = async (
  client: IScopedClusterClient,
  indexPattern: string,
  expandWildcards: ExpandWildcard[]
) => {
  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    expand_wildcards: expandWildcards,
    index: indexPattern,
    metric: ['docs', 'store'],
  });
  return indicesStats;
};
