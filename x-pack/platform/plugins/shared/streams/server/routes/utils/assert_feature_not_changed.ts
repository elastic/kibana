/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { StreamQueryKql } from '@kbn/streams-schema';
import type { QueryClient } from '../../lib/streams/assets/query/query_client';
import { StatusError } from '../../lib/streams/errors/status_error';

/**
 * Validates that the feature field has not changed for existing queries.
 * Throws a StatusError (400) if attempting to modify the feature of an existing query.
 */
export async function assertFeatureNotChanged({
  queryClient,
  streamName,
  queries,
}: {
  queryClient: QueryClient;
  streamName: string;
  queries: Array<{ id: string; feature: StreamQueryKql['feature'] }>;
}): Promise<void> {
  if (queries.length === 0) return;

  const queryIds = queries.map((q) => q.id);
  const existingQueries = await queryClient.bulkGetByIds(streamName, queryIds);
  const existingQueryMap = new Map(existingQueries.map((q) => [q.query.id, q.query]));

  for (const query of queries) {
    const existing = existingQueryMap.get(query.id);
    if (existing && !isEqual(existing.feature, query.feature)) {
      throw new StatusError(
        `Cannot modify feature of existing significant event query [${query.id}]`,
        400
      );
    }
  }
}
