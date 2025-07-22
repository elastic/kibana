/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import {
  SignificantEventsPreviewResponse,
  StreamQueryKql,
  Streams,
  getIndexPatternsForStream,
} from '@kbn/streams-schema';
import { InferSearchResponseOf } from '@kbn/es-types';
import { notFound } from '@hapi/boom';
import type { ChangePointType } from '@kbn/es-types/src';

type PreviewStreamQuery = Pick<StreamQueryKql, 'kql'>;

function createSearchRequest({
  from,
  to,
  query,
  bucketSize,
}: {
  from: Date;
  to: Date;
  query: PreviewStreamQuery;
  bucketSize: string;
}) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from.toISOString(),
                lte: to.toISOString(),
              },
            },
          },
          {
            kql: {
              query: query.kql.query,
            },
            // TODO: kql is not in the ES client's types yet (06-2025)
          } as QueryDslQueryContainer,
        ],
      },
    },
    aggs: {
      occurrences: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: bucketSize,
          extended_bounds: {
            min: from.toISOString(),
            max: to.toISOString(),
          },
        },
      },
      change_points: {
        change_point: {
          buckets_path: 'occurrences>_count',
        },
        // TODO: change_points is not in the ES client's types yet (06-2025)
      } as {},
    },
  };
}

export async function previewSignificantEvents(
  params: {
    definition: Streams.all.Definition;
    query: PreviewStreamQuery;
    from: Date;
    to: Date;
    bucketSize: string;
  },
  dependencies: {
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsPreviewResponse> {
  const { bucketSize, from, to, definition, query } = params;
  const { scopedClusterClient } = dependencies;

  const searchRequest = createSearchRequest({
    bucketSize,
    from,
    query,
    to,
  });

  const response = (await scopedClusterClient.asCurrentUser.search({
    index: getIndexPatternsForStream(definition),
    track_total_hits: false,
    ...searchRequest,
  })) as InferSearchResponseOf<unknown, ReturnType<typeof createSearchRequest>>;

  if (!response.aggregations) {
    throw notFound();
  }

  const aggregations = response.aggregations as typeof response.aggregations & {
    change_points: {
      type: Record<ChangePointType, { p_value: number; change_point: number }>;
    };
  };

  return {
    ...query,
    change_points: aggregations.change_points,
    occurrences:
      aggregations.occurrences.buckets.map((bucket) => {
        return {
          date: bucket.key_as_string,
          count: bucket.doc_count,
        };
      }) ?? [],
  };
}
