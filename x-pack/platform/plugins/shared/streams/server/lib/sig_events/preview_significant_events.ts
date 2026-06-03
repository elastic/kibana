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
import { getColumnIndex } from '../streams/helpers/esql';
import {
  ESQL_UNITS,
  fillBucketGaps,
  MAX_FILL_BUCKETS,
  parseBucketSize,
} from './helpers/fill_bucket_gaps';

const PREVIEW_STATS_LIMIT = 10_000;

function msToEsqlBucketSize(ms: number): string {
  if (ms >= MS_PER_UNIT.d && ms % MS_PER_UNIT.d === 0) return `${ms / MS_PER_UNIT.d}d`;
  if (ms >= MS_PER_UNIT.h && ms % MS_PER_UNIT.h === 0) return `${ms / MS_PER_UNIT.h}h`;
  if (ms >= MS_PER_UNIT.m && ms % MS_PER_UNIT.m === 0) return `${ms / MS_PER_UNIT.m}m`;
  return `${Math.round(ms / MS_PER_UNIT.s)}s`;
}

// Replaces any existing `LIMIT N` with the given limit value via AST surgery.
// Falls back to a regex strip + text append only if parsing fails (malformed
// user input). Keeps the query AST-based end-to-end alongside the rest of
// preview composition (see `buildHistogramQuery`).
function withLimit(esqlQuery: string, limit: number): string {
  try {
    const { root } = Parser.parse(esqlQuery);
    const commandsWithoutLimit = root.commands.filter(
      (cmd) => !('name' in cmd && cmd.name === 'limit')
    ) as ESQLCommand[];
    const limitCommand = Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(limit)],
    });
    return BasicPrettyPrinter.print(
      Builder.expression.query([...commandsWithoutLimit, limitCommand])
    );
  } catch {
    const stripped = esqlQuery
      .replace(/\|\s*LIMIT\s+\d+/gi, '')
      .replace(/\s*\|\s*$/, '')
      .trim();
    return `${stripped} | LIMIT ${limit}`;
  }
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

  const countIdx = getColumnIndex(response, 'count');
  const bucketIdx = getColumnIndex(response, 'bucket');

  if (countIdx === -1 || bucketIdx === -1) {
    return { esql: { query: esqlQuery }, change_points: { type: {} }, occurrences: [] };
  }

  const sparseOccurrences = response.values.map((row) => ({
    date: row[bucketIdx] as string,
    count: (row[countIdx] as number) ?? 0,
  }));

  const { value: bsValue, unit: bsUnit } = parseBucketSize(bucketSize);
  const intervalMs = bsValue * (MS_PER_UNIT[bsUnit] ?? 1000);
  const { buckets: occurrences, truncated } = fillBucketGaps(
    sparseOccurrences,
    from,
    to,
    intervalMs
  );
  if (truncated) {
    logger?.debug(
      `fillBucketGaps reached MAX_FILL_BUCKETS (${MAX_FILL_BUCKETS}); sparkline may be incomplete.`
    );
  }

  const typeIdx = getColumnIndex(response, 'type');
  const pvalueIdx = getColumnIndex(response, 'pvalue');
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

  const composedQuery = withLimit(esqlQuery, PREVIEW_STATS_LIMIT);

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
    const { value: effBsValue, unit: effBsUnit } = parseBucketSize(effectiveBucketSize);
    const effectiveIntervalMs = effBsValue * (MS_PER_UNIT[effBsUnit] ?? 1000);

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
    const { buckets: occurrences, truncated: occurrencesTruncated } = fillBucketGaps(
      sparseOccurrences,
      from,
      to,
      effectiveIntervalMs
    );
    if (occurrencesTruncated) {
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
