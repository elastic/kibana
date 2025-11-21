/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamDocsStat } from '../../../../common';

const BATCH_SIZE = 100;

/**
 * Fetches document counts for multiple streams using msearch to batch requests.
 * This approach queries each stream individually, avoiding reliance on backing index naming patterns.
 */
export async function getDocCountsForStreams(options: {
  esClient: ElasticsearchClient;
  streamNames: string[];
  start: string;
  end: string;
  query?: QueryDslBoolQuery;
}): Promise<StreamDocsStat[]> {
  const { esClient, streamNames, start, end, query } = options;

  if (streamNames.length === 0) {
    return [];
  }

  const rangeFilter: QueryDslQueryContainer = {
    range: {
      '@timestamp': {
        gte: start,
        lte: end,
      },
    },
  };

  const results: StreamDocsStat[] = [];

  // Process streams in batches to avoid overwhelming Elasticsearch
  for (let i = 0; i < streamNames.length; i += BATCH_SIZE) {
    const batch = streamNames.slice(i, i + BATCH_SIZE);

    // Build msearch body: alternating index line and query body
    const searches = batch.flatMap((streamName) => [
      { index: streamName },
      {
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            ...query,
            filter: [
              ...(query?.filter
                ? Array.isArray(query.filter)
                  ? query.filter
                  : [query.filter]
                : []),
              rangeFilter,
            ],
          },
        },
      },
    ]);

    const { responses } = await esClient.msearch({
      searches,
    });

    // Map responses back to stream names by position
    responses.forEach((response, index) => {
      const streamName = batch[index];
      if ('error' in response) {
        // Skip streams that error (e.g., don't exist or no permissions)
        return;
      }

      const count =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      if (count > 0) {
        results.push({
          dataset: streamName,
          count,
        });
      }
    });
  }

  return results;
}
