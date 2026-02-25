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
import type { SignificantEventsPreviewResponse, StreamQuery, Streams } from '@kbn/streams-schema';
import { extractWhereExpression, getIndexPatternsForStream } from '@kbn/streams-schema';

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

function buildEsqlHistogramQuery(esqlQuery: string, indices: string[], bucketSize: string): string {
  const whereExpr = extractWhereExpression(esqlQuery);
  const fromPart = `FROM ${indices.join(',')}`;
  const wherePart = whereExpr ? `| WHERE ${BasicPrettyPrinter.expression(whereExpr)}` : '';
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
  const existingBuckets = new Map(occurrences.map((o) => [new Date(o.date).getTime(), o.count]));

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

export async function previewSignificantEvents(
  params: {
    definition: Streams.all.Definition;
    query: Pick<StreamQuery, 'esql'>;
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
