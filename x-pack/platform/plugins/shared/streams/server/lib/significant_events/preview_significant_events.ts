/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { BasicPrettyPrinter, Builder, Parser } from '@kbn/esql-language';
import type { ESQLCommand } from '@kbn/esql-language';
import type { SignificantEventsPreviewResponse } from '@kbn/streams-schema';

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

/**
 * Takes the user's ES|QL query (which already contains FROM + WHERE), strips
 * everything after the WHERE clause, and appends
 * STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, <interval>)
 * followed by CHANGE_POINT count ON bucket.
 *
 * CHANGE_POINT silently returns no change-point columns when there are
 * insufficient data points (< 22 buckets), so it is always included.
 */
function buildHistogramQuery(esqlQuery: string, bucketSize: string): string {
  const { root } = Parser.parse(esqlQuery);
  const { value, unit } = parseBucketSize(bucketSize);

  const fromCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'from'
  );
  const whereCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'where'
  );

  const statsCommand = Builder.command({
    name: 'stats',
    args: [
      Builder.expression.func.binary('=', [
        Builder.expression.column('count'),
        Builder.expression.func.call('COUNT', [Builder.expression.column('*')]),
      ]),
      Builder.option({
        name: 'by',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column('bucket'),
            Builder.expression.func.call('BUCKET', [
              Builder.expression.column('@timestamp'),
              Builder.expression.literal.timespan(value, ESQL_UNITS[unit] || unit),
            ]),
          ]),
        ],
      }),
    ],
  });

  const changePointCommand = Builder.command({
    name: 'change_point',
    args: [
      Builder.expression.column('count'),
      Builder.option({ name: 'on', args: [Builder.expression.column('bucket')] }),
    ],
  });

  const commands: ESQLCommand[] = [];
  if (fromCmd) commands.push(fromCmd);
  if (whereCmd) commands.push(whereCmd);
  commands.push(statsCommand, changePointCommand);

  return BasicPrettyPrinter.print(Builder.expression.query(commands));
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
    esqlQuery: string;
    from: Date;
    to: Date;
    bucketSize: string;
  },
  dependencies: {
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsPreviewResponse> {
  const { esqlQuery, bucketSize, from, to } = params;
  const { scopedClusterClient } = dependencies;

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

  // CHANGE_POINT silently returns no change-point columns when there are
  // insufficient buckets (< 22), so a single query is enough.
  // drop_null_columns removes them from the response when they are absent,
  // and the column-presence check below handles both cases uniformly.
  const response = await scopedClusterClient.asCurrentUser.esql.query({
    query: buildHistogramQuery(esqlQuery, bucketSize),
    filter,
    drop_null_columns: true,
  });

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
    esql: { query: esqlQuery },
    change_points: changePoints,
    occurrences,
  };
}
