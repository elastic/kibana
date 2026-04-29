/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { BasicPrettyPrinter, Builder, Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import type { SignificantEventsPreviewResponse } from '@kbn/streams-schema';
import {
  hasStatsCommand,
  extractBucketColumnName,
  extractBucketIntervalMs,
  extractBucketTargetField,
  extractStatsGroupColumns,
  MS_PER_UNIT,
} from '@kbn/streams-schema';

const PREVIEW_STATS_LIMIT = 10_000;

// Short-to-long unit names for the ES|QL AST builder (Builder.expression.literal.timespan).
// Millisecond conversions live in MS_PER_UNIT (imported from @kbn/streams-schema).
const ESQL_UNITS: Record<string, string> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

function parseBucketSize(raw: string): { value: number; unit: string } {
  const match = raw.match(/^(\d+)([smhd])$/);
  // 60s (1 minute) is the smallest granularity that produces readable sparklines
  // while remaining efficient. Invalid inputs are caught upstream by the API schema.
  if (!match) return { value: 60, unit: 's' };
  const value = parseInt(match[1], 10);
  if (value < 1) return { value: 60, unit: 's' };
  return { value, unit: match[2] };
}

function msToEsqlBucketSize(ms: number): string {
  if (ms >= MS_PER_UNIT.d && ms % MS_PER_UNIT.d === 0) return `${ms / MS_PER_UNIT.d}d`;
  if (ms >= MS_PER_UNIT.h && ms % MS_PER_UNIT.h === 0) return `${ms / MS_PER_UNIT.h}h`;
  if (ms >= MS_PER_UNIT.m && ms % MS_PER_UNIT.m === 0) return `${ms / MS_PER_UNIT.m}m`;
  return `${Math.round(ms / MS_PER_UNIT.s)}s`;
}

function stripLimitCommand(esql: string): string {
  let result: string;
  try {
    const { root } = Parser.parse(esql);
    const commandsWithoutLimit = root.commands.filter(
      (cmd) => !('name' in cmd && cmd.name === 'limit')
    );
    if (commandsWithoutLimit.length === root.commands.length) return esql;
    result = BasicPrettyPrinter.print(
      Builder.expression.query(commandsWithoutLimit as ESQLCommand[])
    );
  } catch {
    result = esql.replace(/\|\s*LIMIT\s+\d+/gi, '');
  }
  return result.replace(/\s*\|\s*$/, '').trim();
}

/**
 * Builds the histogram query for match-type previews.
 *
 * Takes the user's ES|QL query (which already contains FROM + WHERE), strips
 * everything after the WHERE clause, and appends
 * STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, <interval>)
 * followed by CHANGE_POINT count ON bucket.
 *
 * CHANGE_POINT silently returns no change-point columns when there are
 * insufficient data points (< 22 buckets), so it is always included.
 *
 * For STATS-type queries the user's own aggregation pipeline is executed
 * directly — see {@link previewStatsQuery}.
 */
function buildHistogramQuery(
  esqlQuery: string,
  bucketSize: string,
  timestampField: string = '@timestamp'
): string {
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
              Builder.expression.column(timestampField),
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
const MAX_FILL_BUCKETS = 10_000;

function fillBucketGaps(
  occurrences: Array<{ date: string; count: number }>,
  from: Date,
  to: Date,
  bucketSize: string
): Array<{ date: string; count: number }> {
  const { value, unit } = parseBucketSize(bucketSize);
  const msPerUnit = MS_PER_UNIT[unit];
  if (!msPerUnit) {
    throw new Error(`Unrecognized bucket unit "${unit}" in bucket size "${bucketSize}"`);
  }
  const intervalMs = value * msPerUnit;
  const existingBuckets = new Map(occurrences.map((o) => [new Date(o.date).getTime(), o.count]));

  const result: Array<{ date: string; count: number }> = [];
  let current = Math.floor(from.getTime() / intervalMs) * intervalMs;
  const endMs = to.getTime();

  while (current <= endMs && result.length < MAX_FILL_BUCKETS) {
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
    timestampField?: string;
  },
  dependencies: {
    scopedClusterClient: IScopedClusterClient;
    logger?: Logger;
  }
): Promise<SignificantEventsPreviewResponse> {
  const { esqlQuery, bucketSize, from, to, timestampField = '@timestamp' } = params;
  const { scopedClusterClient, logger } = dependencies;

  const isStats = hasStatsCommand(esqlQuery);
  const resolvedBucketTarget = isStats ? extractBucketTargetField(esqlQuery) : null;
  if (isStats && !resolvedBucketTarget) {
    logger?.warn(
      `STATS preview could not resolve a bucket target field from the ES|QL query; falling back to "${timestampField}". ` +
        'Results may be incorrect if the query uses a custom temporal field.'
    );
  }
  const effectiveTimestampField = resolvedBucketTarget ?? timestampField;

  const filter: QueryDslQueryContainer = {
    bool: {
      filter: [
        {
          range: {
            [effectiveTimestampField]: { gte: from.toISOString(), lte: to.toISOString() },
          },
        },
      ],
    },
  };

  if (isStats) {
    return previewStatsQuery(
      { esqlQuery, filter, from, to, bucketSize },
      { scopedClusterClient, logger }
    );
  }

  return previewMatchQuery(
    { esqlQuery, filter, from, to, bucketSize, timestampField: effectiveTimestampField },
    { scopedClusterClient, logger }
  );
}

async function previewMatchQuery(
  params: {
    esqlQuery: string;
    filter: QueryDslQueryContainer;
    from: Date;
    to: Date;
    bucketSize: string;
    timestampField?: string;
  },
  deps: { scopedClusterClient: IScopedClusterClient; logger?: Logger }
): Promise<SignificantEventsPreviewResponse> {
  const { esqlQuery, filter, from, to, bucketSize, timestampField } = params;
  const { scopedClusterClient, logger } = deps;

  const response = await scopedClusterClient.asCurrentUser.esql.query({
    query: buildHistogramQuery(esqlQuery, bucketSize, timestampField),
    filter,
    drop_null_columns: true,
  });

  const countIdx = response.columns.findIndex((col) => col.name === 'count');
  const bucketIdx = response.columns.findIndex((col) => col.name === 'bucket');

  if (countIdx === -1 || bucketIdx === -1) {
    return { esql: { query: esqlQuery }, change_points: { type: {} }, occurrences: [] };
  }

  const sparseOccurrences = response.values.map((row) => ({
    date: row[bucketIdx] as string,
    count: (row[countIdx] as number) ?? 0,
  }));

  const occurrences = fillBucketGaps(sparseOccurrences, from, to, bucketSize);
  if (occurrences.length >= MAX_FILL_BUCKETS) {
    logger?.debug(
      `fillBucketGaps reached MAX_FILL_BUCKETS (${MAX_FILL_BUCKETS}); sparkline may be incomplete.`
    );
  }

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
            // Falls back to index 0 when the change-point bucket lands
            // outside the gap-filled range (e.g., rounding mismatch).
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

/**
 * STATS queries already contain their own aggregation pipeline. Execute them
 * as-is (including the threshold WHERE clause). Each returned row represents
 * a group cell that exceeded the threshold -- a "would have fired" event.
 *
 * **Bucket size**: the sparkline uses the query's own BUCKET interval (extracted
 * via {@link extractBucketIntervalMs}) rather than the caller's `bucketSize`.
 * When extraction fails (no BUCKET call, unusual syntax), the caller's
 * `bucketSize` is used as fallback — the sparkline granularity may not match
 * the actual query in that case.
 */
async function previewStatsQuery(
  params: {
    esqlQuery: string;
    filter: QueryDslQueryContainer;
    from: Date;
    to: Date;
    bucketSize: string;
  },
  deps: { scopedClusterClient: IScopedClusterClient; logger?: Logger }
): Promise<SignificantEventsPreviewResponse> {
  const { esqlQuery, filter, from, to, bucketSize } = params;
  const { scopedClusterClient, logger } = deps;

  const queryWithoutLimit = stripLimitCommand(esqlQuery);
  const composedQuery = `${queryWithoutLimit} | LIMIT ${PREVIEW_STATS_LIMIT}`;

  logger?.debug(`STATS preview executing composed query: ${composedQuery}`);

  const response = await scopedClusterClient.asCurrentUser.esql.query({
    query: composedQuery,
    filter,
    drop_null_columns: true,
  });

  const firingCount = response.values.length;
  const truncated = firingCount >= PREVIEW_STATS_LIMIT;
  const groupCols = extractStatsGroupColumns(esqlQuery);
  const bucketName = extractBucketColumnName(esqlQuery);
  const multiGroup = bucketName
    ? groupCols.filter((col) => col !== bucketName).length > 0
    : groupCols.length > 1;

  if (truncated) {
    logger?.warn(
      `STATS preview hit PREVIEW_STATS_LIMIT (${PREVIEW_STATS_LIMIT}); firing_count and sparkline data may be incomplete.`
    );
  }

  const astBucketName = bucketName;
  const bucketCol = astBucketName
    ? response.columns.find((col) => col.name === astBucketName)
    : response.columns.find((col) => col.name === '@timestamp' && col.type === 'date') ??
      response.columns.find((col) => col.type === 'date');

  if (!bucketCol && firingCount > 0) {
    logger?.warn(
      `STATS preview returned ${firingCount} firing rows but no temporal bucket column could be resolved (astBucketName=${
        astBucketName ?? 'null'
      }, columns=${response.columns.map((c) => c.name).join(', ')}). Sparkline will be empty.`
    );
  }

  if (bucketCol) {
    const bucketIdx = response.columns.indexOf(bucketCol);
    const firingDates = response.values.map((row) => row[bucketIdx] as string).filter(Boolean);

    // The query's own BUCKET interval may differ from the UI's requested
    // bucketSize (e.g. query uses 5m but the UI requests 1h). We honour the
    // query's interval so the sparkline granularity matches what the user wrote.
    // Caveat: ES BUCKET boundaries are absolute (epoch-aligned), so from/to
    // edges may not align perfectly — fillBucketGaps pads to cover the range.
    const queryBucketMs = extractBucketIntervalMs(esqlQuery);
    const effectiveBucketSize = queryBucketMs ? msToEsqlBucketSize(queryBucketMs) : bucketSize;

    // For multi-dimensional STATS (GROUP BY entity + bucket), multiple groups
    // firing in the same bucket are summed. The sparkline shows total firing
    // density (how many entity × bucket cells breached) rather than unique
    // time buckets. This is intentional — it surfaces "how bad" each moment is.
    const aggregatedByBucket = new Map<string, number>();
    for (const date of firingDates) {
      aggregatedByBucket.set(date, (aggregatedByBucket.get(date) ?? 0) + 1);
    }
    const sparseOccurrences = [...aggregatedByBucket.entries()].map(([date, count]) => ({
      date,
      count,
    }));
    const occurrences = fillBucketGaps(sparseOccurrences, from, to, effectiveBucketSize);
    if (occurrences.length >= MAX_FILL_BUCKETS) {
      logger?.debug(
        `fillBucketGaps reached MAX_FILL_BUCKETS (${MAX_FILL_BUCKETS}); sparkline may be incomplete.`
      );
    }

    return {
      esql: { query: esqlQuery },
      change_points: { type: {} },
      occurrences,
      firing_count: firingCount,
      truncated,
      multi_group: multiGroup || undefined,
    };
  }

  return {
    esql: { query: esqlQuery },
    change_points: { type: {} },
    occurrences: [],
    firing_count: firingCount,
    truncated,
    multi_group: multiGroup || undefined,
  };
}
