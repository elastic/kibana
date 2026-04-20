/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { groupBy } from 'lodash';
import type { SignificantEventQueryRow } from './use_fetch_discovery_queries';
import type { BulkOperationResult } from './use_discovery_features_api';
import { useQueriesApi } from './use_queries_api';

interface DiscoveryQueriesApi {
  deleteQueriesInBulk: (queries: SignificantEventQueryRow[]) => Promise<BulkOperationResult>;
}

export function useDiscoveryQueriesApi(): DiscoveryQueriesApi {
  const { deleteQueriesInBulk: deleteForStream } = useQueriesApi();

  return useMemo(
    () => ({
      deleteQueriesInBulk: async (
        queries: SignificantEventQueryRow[]
      ): Promise<BulkOperationResult> => {
        const queriesByStream = groupBy(queries, 'stream_name');
        const entries = Object.entries(queriesByStream);

        const results = await Promise.allSettled(
          entries.map(([streamName, streamQueries]) =>
            deleteForStream({
              queryIds: streamQueries.map((q) => q.query.id),
              streamName,
            })
          )
        );

        let succeededCount = 0;
        let failedCount = 0;

        results.forEach((result, index) => {
          const count = entries[index][1].length;
          if (result.status === 'fulfilled') {
            succeededCount += count;
          } else {
            failedCount += count;
          }
        });

        return { succeededCount, failedCount };
      },
    }),
    [deleteForStream]
  );
}
