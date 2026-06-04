/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { IScopedClusterClient } from '@kbn/core/server';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { StreamQuery, SignificantEventsGetResponse } from '@kbn/streams-schema';
import { MS_PER_UNIT } from '@kbn/streams-schema';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { isEmpty, keyBy } from 'lodash';
import type { QueryLink, SearchMode } from '../../../common/queries';
import type { QueryClient, QueryLinkFilters } from '../streams/assets/query/query_client';
import { parseError } from '../streams/errors/parse_error';
import { SecurityError } from '../streams/errors/security_error';
import { getColumnIndex, toEsqlRequest } from '../streams/helpers/esql';
import { ALERTS_DATA_STREAM } from './alerts_data_stream';
import { ESQL_UNITS, fillBucketGaps, parseBucketSize } from './helpers/fill_bucket_gaps';

// `change_points` on the GET response is no longer populated by the server.
// Kept as an empty stub until the consumer-side schema/usage is removed.
const EMPTY_CHANGE_POINTS = { type: {} } as const;

// Shared empty array for rules with no firings and the alerts-index-missing path
// — mirrors the pre-ES|QL DSL `notFoundSignificantEvents` behaviour.
const EMPTY_OCCURRENCES: Array<{ date: string; count: number }> = [];

export const V1_ALERTS_SOURCE = 'v1' as const;
export const V2_ALERTS_SOURCE = 'v2' as const;

export type AlertsSource = typeof V1_ALERTS_SOURCE | typeof V2_ALERTS_SOURCE;

export async function readSignificantEventsFromAlertsIndices(
  params: {
    streamNames?: string[];
    from: Date;
    to: Date;
    bucketSize: string;
    query?: string;
    filters?: QueryLinkFilters;
    searchMode?: SearchMode;
    alertsSource?: AlertsSource;
  },
  dependencies: {
    queryClient: QueryClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { queryClient, scopedClusterClient } = dependencies;
  const { streamNames = [], from, to, bucketSize, query, filters, searchMode } = params;

  const queryLinks = query
    ? await queryClient.findQueries(streamNames, query, filters, searchMode)
    : await queryClient.getQueryLinks(streamNames, filters);

  if (isEmpty(queryLinks)) {
    return { significant_events: [], aggregated_occurrences: [] };
  }

  const queryLinkByRuleId = keyBy(queryLinks, (queryLink) => queryLink.rule_id);
  const ruleIds = Object.keys(queryLinkByRuleId);

  const { value, unit } = parseBucketSize(bucketSize);
  const esqlUnit = ESQL_UNITS[unit] ?? unit;
  const intervalMs = value * (MS_PER_UNIT[unit] ?? 1000);

  // ES|QL `IN (?param)` does not expand array params — emit one literal per value.
  const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
  const ruleUuidCol = esql.col(ALERT_RULE_UUID.split('.'));

  let response: Awaited<ReturnType<typeof scopedClusterClient.asCurrentUser.esql.query>>;
  try {
    response = await scopedClusterClient.asCurrentUser.esql.query({
      ...toEsqlRequest(
        esql.from([ALERTS_DATA_STREAM]).where`${ruleUuidCol} IN (${ruleIdLiterals})`
          .pipe`STATS count = COUNT(*) BY rule_uuid = ${ruleUuidCol}, bucket = BUCKET(@timestamp, ${esql.num(
          value
        )} ${esql.kwd(esqlUnit)})`.pipe`SORT bucket ASC`
      ),
      filter: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: from.toISOString(), lte: to.toISOString() } } }],
        },
      },
      drop_null_columns: true,
    });
  } catch (err) {
    const { type, message } = parseError(err);
    if (type === 'security_exception') {
      throw new SecurityError(
        `Cannot read significant events, insufficient privileges: ${message}`,
        { cause: err instanceof Error ? err : new Error(String(err)) }
      );
    }
    // Alerts index missing (no rules have fired yet) → same empty shape as
    // a per-rule "not found". Other verification_exception flavours (unknown
    // column, malformed query, mapping regression) rethrow so they surface
    // instead of silently producing empty sparklines.
    if (isEsqlUnknownIndexError(err)) {
      return buildEmptyResponse(queryLinks);
    }
    throw err;
  }

  const countIdx = getColumnIndex(response, 'count');
  const ruleIdx = getColumnIndex(response, 'rule_uuid');
  const bucketIdx = getColumnIndex(response, 'bucket');

  if (countIdx === -1 || ruleIdx === -1 || bucketIdx === -1) {
    return buildEmptyResponse(queryLinks);
  }

  const sparseByRule = new Map<string, Array<{ date: string; count: number }>>();
  for (const row of response.values) {
    const ruleId = row[ruleIdx] as string;
    const date = row[bucketIdx] as string;
    const count = (row[countIdx] as number) ?? 0;
    const bucket = sparseByRule.get(ruleId);
    if (bucket) {
      bucket.push({ date, count });
    } else {
      sparseByRule.set(ruleId, [{ date, count }]);
    }
  }

  // Sum per-rule counts into a single epoch-aligned series for the overall sparkline.
  const dateToTotal = new Map<string, number>();
  for (const [, sparse] of sparseByRule) {
    for (const { date, count } of fillBucketGaps(sparse, from, to, intervalMs).buckets) {
      dateToTotal.set(date, (dateToTotal.get(date) ?? 0) + count);
    }
  }
  // Outer fill covers the all-zero-firings case (empty `sparseByRule` → empty
  // `dateToTotal`); without it the histogram would render empty instead of flat.
  const { buckets: aggregatedOccurrences } = fillBucketGaps(
    [...dateToTotal.entries()].map(([date, count]) => ({ date, count })),
    from,
    to,
    intervalMs
  );

  // Rules with no firings get `[]`, not a zero-filled series — see EMPTY_OCCURRENCES.
  const significantEvents = queryLinks.map((queryLink) => {
    const sparse = sparseByRule.get(queryLink.rule_id);
    return {
      ...toStreamQuery(queryLink),
      stream_name: queryLink.stream_name,
      occurrences: sparse
        ? fillBucketGaps(sparse, from, to, intervalMs).buckets
        : EMPTY_OCCURRENCES,
      change_points: EMPTY_CHANGE_POINTS,
      rule_backed: queryLink.rule_backed,
    };
  });

  return { significant_events: significantEvents, aggregated_occurrences: aggregatedOccurrences };
}

function buildEmptyResponse(queryLinks: QueryLink[]): SignificantEventsGetResponse {
  return {
    significant_events: queryLinks.map((queryLink) => ({
      ...toStreamQuery(queryLink),
      stream_name: queryLink.stream_name,
      occurrences: EMPTY_OCCURRENCES,
      change_points: EMPTY_CHANGE_POINTS,
      rule_backed: queryLink.rule_backed,
    })),
    aggregated_occurrences: EMPTY_OCCURRENCES,
  };
}

const toStreamQuery = (queryLink: QueryLink): StreamQuery => queryLink.query;
