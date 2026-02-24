/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { BasicPrettyPrinter } from '@kbn/esql-language';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { SignificantEventsPreviewResponse, StreamQuery, Streams } from '@kbn/streams-schema';
import { getIndexPatternsForStream, isNativeEsqlQuery } from '@kbn/streams-schema';
import { extractWhereExpression } from '../helpers/esql_helpers';
import { notFound } from '@hapi/boom';
import type { ChangePointType } from '@kbn/es-types/src';
import type { Condition } from '@kbn/streamlang';
import { conditionToQueryDsl } from '@kbn/streamlang';

type PreviewStreamQuery = Pick<StreamQuery, 'kql' | 'feature'> & {
  esql?: { query: string };
};

function createSearchRequest({
  from,
  to,
  kuery,
  featureFilter,
  bucketSize,
}: {
  from: Date;
  to: Date;
  kuery: string;
  featureFilter?: Condition;
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
          ...(featureFilter ? [conditionToQueryDsl(featureFilter)] : []),
          {
            kql: {
              query: kuery,
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

/**
 * Converts a fixed-interval string (e.g. "300s") to an ES|QL time literal
 * (e.g. "300 seconds") for use in the BUCKET function.
 */
function toEsqlDuration(bucketSize: string): string {
  const match = bucketSize.match(/^(\d+)([smhd])$/);
  if (!match) return bucketSize;
  const [, value, unit] = match;
  const unitMap: Record<string, string> = {
    s: 'seconds',
    m: 'minutes',
    h: 'hours',
    d: 'days',
  };
  return `${value} ${unitMap[unit] || unit}`;
}

function parseBucketSizeMs(bucketSize: string): number {
  const match = bucketSize.match(/^(\d+)([smhd])$/);
  if (!match) return 60000;
  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };
  return parseInt(value, 10) * (multipliers[unit] || 1000);
}

function buildEsqlHistogramQuery(
  esqlQuery: string,
  indices: string[],
  bucketSize: string
): string {
  const whereExpr = extractWhereExpression(esqlQuery);
  const fromPart = `FROM ${indices.join(',')}`;
  const wherePart = whereExpr
    ? `| WHERE ${BasicPrettyPrinter.expression(whereExpr)}`
    : '';
  const interval = toEsqlDuration(bucketSize);

  return `${fromPart} ${wherePart} | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${interval})`;
}

/**
 * ES|QL BUCKET does not emit empty buckets. This function fills gaps so the
 * sparkline chart receives a contiguous time series.
 */
function fillBucketGaps(
  occurrences: Array<{ date: string; count: number }>,
  from: Date,
  to: Date,
  bucketSize: string
): Array<{ date: string; count: number }> {
  const intervalMs = parseBucketSizeMs(bucketSize);
  const existingBuckets = new Map(
    occurrences.map((o) => [new Date(o.date).getTime(), o.count])
  );

  const result: Array<{ date: string; count: number }> = [];
  let current = Math.floor(from.getTime() / intervalMs) * intervalMs;
  const endMs = to.getTime();

  while (current <= endMs) {
    result.push({
      date: new Date(current).toISOString(),
      count: existingBuckets.get(current) ?? 0,
    });
    current += intervalMs;
  }

  return result;
}

async function previewWithKql(
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
    kuery: query.kql.query,
    featureFilter: query.feature?.filter,
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

async function previewWithEsql(
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

  const indices = getIndexPatternsForStream(definition);
  const esqlQuery = buildEsqlHistogramQuery(query.esql!.query, indices, bucketSize);

  const filter: QueryDslQueryContainer = {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': { gte: from.toISOString(), lte: to.toISOString() },
          },
        },
        ...(query.feature?.filter ? [conditionToQueryDsl(query.feature.filter)] : []),
      ],
    },
  };

  const response = (await scopedClusterClient.asCurrentUser.esql.query({
    query: esqlQuery,
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;

  const countIdx = response.columns.findIndex((col) => col.name === 'count');
  const bucketIdx = response.columns.findIndex((col) => col.name === 'bucket');

  const sparseOccurrences = response.values.map((row) => ({
    date: row[bucketIdx] as string,
    count: (row[countIdx] as number) ?? 0,
  }));

  const occurrences = fillBucketGaps(sparseOccurrences, from, to, bucketSize);

  return {
    ...query,
    change_points: { type: {} },
    occurrences,
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
  if (isNativeEsqlQuery(params.query)) {
    return previewWithEsql(params, dependencies);
  }
  return previewWithKql(params, dependencies);
}
