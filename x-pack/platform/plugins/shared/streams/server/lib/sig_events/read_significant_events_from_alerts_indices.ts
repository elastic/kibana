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
import { isEmpty } from 'lodash';
import type { QueryLink, SearchMode } from '../../../common/queries';
import type { KnowledgeIndicatorClient } from '../streams/ki';
import type { RuleUnbackedFilter } from '../streams/ki';
import { parseError } from '../streams/errors/parse_error';
import { SecurityError } from '../streams/errors/security_error';
import { getColumnIndex, toEsqlRequest } from '../streams/helpers/esql';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from './alerts_data_stream';
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
    filters?: { ruleUnbacked?: RuleUnbackedFilter; queryIds?: string[]; minSeverityScore?: number };
    searchMode?: SearchMode;
    alertsSource?: AlertsSource;
  },
  dependencies: {
    kiClient: KnowledgeIndicatorClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { kiClient, scopedClusterClient } = dependencies;
  const {
    streamNames = [],
    from,
    to,
    bucketSize,
    query,
    filters,
    searchMode,
    alertsSource = V1_ALERTS_SOURCE,
  } = params;

  const queryLinks = query
    ? await kiClient.findQueries(streamNames, query, filters, searchMode)
    : await kiClient.getQueryLinks(streamNames, filters);

  if (isEmpty(queryLinks)) {
    return { significant_events: [], aggregated_occurrences: [] };
  }

  if (alertsSource === V2_ALERTS_SOURCE) {
    return readFromV2RuleEvents({ queryLinks, from, to, bucketSize, scopedClusterClient });
  }

  return readFromV1AlertsIndex({ queryLinks, from, to, bucketSize, scopedClusterClient });
}

async function readFromV1AlertsIndex({
  queryLinks,
  from,
  to,
  bucketSize,
  scopedClusterClient,
}: {
  queryLinks: QueryLink[];
  from: Date;
  to: Date;
  bucketSize: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<SignificantEventsGetResponse> {
  const ruleIds = queryLinks.map((link) => link.rule_id);
  const { value, unit } = parseBucketSize(bucketSize);
  const esqlUnit = ESQL_UNITS[unit] ?? unit;
  const intervalMs = value * (MS_PER_UNIT[unit] ?? 1000);

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
    return handleEsqlReadError(err, queryLinks);
  }

  return buildOccurrencesResponse({
    queryLinks,
    response,
    from,
    to,
    intervalMs,
    ruleIdColumn: 'rule_uuid',
  });
}

async function readFromV2RuleEvents({
  queryLinks,
  from,
  to,
  bucketSize,
  scopedClusterClient,
}: {
  queryLinks: QueryLink[];
  from: Date;
  to: Date;
  bucketSize: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<SignificantEventsGetResponse> {
  const ruleIds = queryLinks.map((link) => link.rule_id);
  const { value, unit } = parseBucketSize(bucketSize);
  const esqlUnit = ESQL_UNITS[unit] ?? unit;
  const intervalMs = value * (MS_PER_UNIT[unit] ?? 1000);

  const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
  const ruleIdCol = esql.col(['rule', 'id']);

  let response: Awaited<ReturnType<typeof scopedClusterClient.asCurrentUser.esql.query>>;
  try {
    response = await scopedClusterClient.asCurrentUser.esql.query({
      ...toEsqlRequest(
        esql.from([RULE_EVENTS_DATA_STREAM]).where`${ruleIdCol} IN (${ruleIdLiterals})`
          .pipe`STATS count = COUNT_DISTINCT(group_hash) BY rule_id = ${ruleIdCol}, bucket = BUCKET(@timestamp, ${esql.num(
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
    return handleEsqlReadError(err, queryLinks);
  }

  return buildOccurrencesResponse({
    queryLinks,
    response,
    from,
    to,
    intervalMs,
    ruleIdColumn: 'rule_id',
  });
}

function handleEsqlReadError(err: unknown, queryLinks: QueryLink[]): SignificantEventsGetResponse {
  const { type, message } = parseError(err);
  if (type === 'security_exception') {
    throw new SecurityError(`Cannot read significant events, insufficient privileges: ${message}`, {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
  }
  if (isEsqlUnknownIndexError(err)) {
    return buildEmptyResponse(queryLinks);
  }
  throw err;
}

function buildOccurrencesResponse({
  queryLinks,
  response,
  from,
  to,
  intervalMs,
  ruleIdColumn,
}: {
  queryLinks: QueryLink[];
  response: Awaited<ReturnType<IScopedClusterClient['asCurrentUser']['esql']['query']>>;
  from: Date;
  to: Date;
  intervalMs: number;
  ruleIdColumn: 'rule_uuid' | 'rule_id';
}): SignificantEventsGetResponse {
  const countIdx = getColumnIndex(response, 'count');
  const ruleIdx = getColumnIndex(response, ruleIdColumn);
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

  const dateToTotal = new Map<string, number>();
  for (const [, sparse] of sparseByRule) {
    for (const { date, count } of fillBucketGaps(sparse, from, to, intervalMs).buckets) {
      dateToTotal.set(date, (dateToTotal.get(date) ?? 0) + count);
    }
  }
  const { buckets: aggregatedOccurrences } = fillBucketGaps(
    [...dateToTotal.entries()].map(([date, count]) => ({ date, count })),
    from,
    to,
    intervalMs
  );

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
