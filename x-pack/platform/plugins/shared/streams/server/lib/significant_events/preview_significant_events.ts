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

const ESQL_UNITS: Record<string, string> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

const MS_PER_UNIT: Record<string, number> = {
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000,
};

function parseBucketSize(raw: string): { value: number; unit: string } {
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return { value: 60, unit: 's' };
  return { value: parseInt(match[1], 10), unit: match[2] };
}

function buildEsqlQuery(
  esqlQuery: string,
  indices: string[],
  bucketSize: string,
  withChangePoint: boolean
): string {
  const { value, unit } = parseBucketSize(bucketSize);
  const whereExpr = extractWhereExpression(esqlQuery);
  const fromPart = `FROM ${indices.join(',')}`;
  const wherePart = whereExpr ? `| WHERE ${BasicPrettyPrinter.expression(whereExpr)}` : '';
  const interval = `${value} ${ESQL_UNITS[unit] || unit}`;

  let query = `${fromPart} ${wherePart} | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${interval})`;
  if (withChangePoint) {
    query += ' | CHANGE_POINT count ON bucket';
  }
  return query;
}

/**
 * ES|QL BUCKET does not emit empty buckets (unlike date_histogram with
 * extended_bounds). Fill the gaps so the sparkline receives a contiguous series.
 */
function fillBucketGaps(
  occurrences: Array<{ date: string; count: number }>,
  from: Date,
  to: Date,
  bucketSize: string
): Array<{ date: string; count: number }> {
  const { value, unit } = parseBucketSize(bucketSize);
  const intervalMs = value * (MS_PER_UNIT[unit] || 1000);
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

  // Try with CHANGE_POINT to get histogram + change-point detection in a
  // single round trip. Falls back to histogram-only when CHANGE_POINT cannot
  // run (e.g. fewer than 22 buckets).
  let response: ESQLSearchResponse;
  try {
    response = (await scopedClusterClient.asCurrentUser.esql.query({
      query: buildEsqlQuery(query.esql!.query, indices, bucketSize, true),
      filter,
    })) as unknown as ESQLSearchResponse;
  } catch {
    response = (await scopedClusterClient.asCurrentUser.esql.query({
      query: buildEsqlQuery(query.esql!.query, indices, bucketSize, false),
      filter,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;
  }

  const countIdx = response.columns.findIndex((col) => col.name === 'count');
  const bucketIdx = response.columns.findIndex((col) => col.name === 'bucket');

  const sparseOccurrences = response.values.map((row) => ({
    date: row[bucketIdx] as string,
    count: (row[countIdx] as number) ?? 0,
  }));

  const occurrences = fillBucketGaps(sparseOccurrences, from, to, bucketSize);

  // Parse change point columns if present (CHANGE_POINT adds `type` and `pvalue`)
  const typeIdx = response.columns.findIndex((col) => col.name === 'type');
  const pvalueIdx = response.columns.findIndex((col) => col.name === 'pvalue');
  let changePoints: SignificantEventsPreviewResponse['change_points'] = { type: {} };

  if (typeIdx >= 0 && pvalueIdx >= 0) {
    const cpRow = response.values.find((row) => row[typeIdx] != null);
    if (cpRow) {
      const cpBucketMs = new Date(cpRow[bucketIdx] as string).getTime();
      const cpIndex = occurrences.findIndex((o) => new Date(o.date).getTime() === cpBucketMs);
      changePoints = {
        type: {
          [cpRow[typeIdx] as string]: {
            p_value: cpRow[pvalueIdx] as number,
            change_point: cpIndex >= 0 ? cpIndex : 0,
          },
        },
      };
    }
  }

  return {
    ...query,
    change_points: changePoints,
    occurrences,
  };
}
