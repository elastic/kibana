/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { EVENTS_SERIES_ID_EVAL } from '@kbn/alerting-v2-common-queries';
import { encodeSeriesId, type DecodedSeriesId } from '@kbn/alerting-v2-utils';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getAlertEpisodeNotFoundMessage } from '../../errors/alert_error_messages';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import type { AlertEventRecord, RawAlertEventRow } from '../types';
import { parseDataJson } from '../utils/parse_data_json';
import { getSeriesNotFoundError } from '../utils/series_id';

/**
 * Canonicalises an ES|QL response from any of the alert-event projections
 * (latest-per-group, pre-deactivate, …) into {@link AlertEventRecord}
 * instances with a parsed `data_json`. Centralising the parse means every
 * producer of `AlertEventRecord` honours the contract uniformly — handler
 * code never has to second-guess whether the field is a JS object or a
 * raw string.
 */
export const toAlertEventRecords = (response: EsqlQueryResponse): AlertEventRecord[] =>
  queryResponseToRecords<RawAlertEventRow>(response).map((row) => ({
    ...row,
    data_json: parseDataJson(row.data_json),
  }));

/** Row of the by-series projection: the event columns plus the series it was grouped under. */
type RawSeriesEventRow = RawAlertEventRow & { series_id: string };

interface LoadLatestAlertEventsBySeriesParams {
  queryService: QueryServiceContract;
  spaceId: string;
  series: readonly DecodedSeriesId[];
}

/**
 * Filters `.rule-events` to one decoded series: rule-backed series by the
 * rule that owns them, external ones by their source, both by `group_hash`.
 */
const buildSeriesCondition = (series: DecodedSeriesId) =>
  series.kind === 'rule'
    ? esql.exp`rule.id == ${series.rule_id} AND group_hash == ${series.group_hash}`
    : esql.exp`source == ${series.source} AND group_hash == ${series.group_hash}`;

/**
 * Resolves the latest `.rule-events` row per series in a single ES|QL
 * round-trip, keyed by the series' id(`encodeSeriesId`). A series
 * is identified by its owner and `group_hash`. The space is always the
 * request's `spaceId`, which every series passed in must already belong to:
 * callers validate the space of a client-supplied series id before getting
 * here. Series that have no matching event don't appear in the result;
 * callers that need throw-on-empty semantics layer that on top
 * ({@link loadLastSeriesAlertEventOrThrow}).
 */
export const loadLatestAlertEventsBySeries = async ({
  queryService,
  spaceId,
  series,
}: LoadLatestAlertEventsBySeriesParams): Promise<Map<string, AlertEventRecord>> => {
  if (series.length === 0) {
    return new Map();
  }

  const conditions = series.map(buildSeriesCondition);
  const seriesCondition = conditions.reduce(
    (accumulated, condition) => esql.exp`${accumulated} OR ${condition}`
  );

  const query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`type == "alert" AND space_id == ${spaceId}`.where`${seriesCondition}`
    .pipe`EVAL data_json = JSON_EXTRACT(_source, "$.data")`.pipe(EVENTS_SERIES_ID_EVAL)
    .pipe`DROP _source`.pipe`STATS
        @timestamp = MAX(@timestamp),
        episode_id = LAST(episode.id, @timestamp),
        episode_status = LAST(episode.status, @timestamp),
        episode_status_count = LAST(episode.status_count, @timestamp),
        data_json = LAST(data_json, @timestamp),
        severity = LAST(severity, @timestamp),
        status = LAST(status, @timestamp),
        source = LAST(source, @timestamp),
        rule_id = LAST(rule.id, @timestamp),
        rule_version = LAST(rule.version, @timestamp),
        group_hash = LAST(group_hash, @timestamp),
        space_id = LAST(space_id, @timestamp)
      BY series_id`
    .keep(
      '@timestamp',
      'group_hash',
      'episode_id',
      'episode_status',
      'episode_status_count',
      'rule_id',
      'rule_version',
      'space_id',
      'status',
      'source',
      'data_json',
      'severity',
      'series_id'
    )
    .toRequest();

  const rows = queryResponseToRecords<RawSeriesEventRow>(
    await queryService.executeQuery({ query: query.query })
  );

  return new Map(
    rows.map(({ series_id: seriesId, ...row }) => [
      seriesId,
      { ...row, data_json: parseDataJson(row.data_json) },
    ])
  );
};

interface LoadLatestAlertEventsByEpisodeIdParams {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeIds: readonly string[];
}

/**
 * Resolves the latest `.rule-events` row per episode (`episode.id`) in a
 * single ES|QL round-trip, without requiring the caller to know the series
 * the episode belongs to — `group_hash` is aggregated off the episode's own
 * events. Episode ids are UUIDv4 (see the director's episode creation), so
 * an id plus the `space_id` filter uniquely identifies one episode;
 * externally-sourced events could theoretically collide across groups
 * within a space, in which case the per-episode bucket would merge rows —
 * practically unreachable.
 *
 * Episodes with no matching event don't appear in the result; callers that
 * need throw-on-empty semantics layer that on top
 * ({@link loadLastEpisodeAlertEventOrThrow}).
 */
export const loadLatestAlertEventsByEpisodeId = async ({
  queryService,
  spaceId,
  episodeIds,
}: LoadLatestAlertEventsByEpisodeIdParams): Promise<AlertEventRecord[]> => {
  if (episodeIds.length === 0) {
    return [];
  }

  const episodeIdValues = [...new Set(episodeIds)].map((episodeId) => esql.str(episodeId));

  const query = esql`
    FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
    | WHERE type == "alert" AND space_id == ${spaceId} AND episode.id IN (${episodeIdValues})
    | EVAL data_json = JSON_EXTRACT(_source, "$.data"), episode_id = episode.id
    | DROP _source
    | STATS
        @timestamp = MAX(@timestamp),
        group_hash = LAST(group_hash, @timestamp),
        episode_status = LAST(episode.status, @timestamp),
        episode_status_count = LAST(episode.status_count, @timestamp),
        data_json = LAST(data_json, @timestamp),
        severity = LAST(severity, @timestamp),
        status = LAST(status, @timestamp),
        source = LAST(source, @timestamp),
        rule_id = LAST(rule.id, @timestamp),
        rule_version = LAST(rule.version, @timestamp)
      BY episode_id, space_id
    | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, source, data_json, severity
  `.toRequest();

  return toAlertEventRecords(await queryService.executeQuery({ query: query.query }));
};

interface LoadLastSeriesAlertEventParams {
  queryService: QueryServiceContract;
  spaceId: string;
  /** The id the caller sent, echoed back in the not-found error. */
  seriesId: string;
  series: DecodedSeriesId;
}

/**
 * Single-series adapter over {@link loadLatestAlertEventsBySeries}: returns
 * the most recent `.rule-events` row for one series or throws `Boom.notFound`
 * with the canonical `ALERT_EVENT_NOT_FOUND` shape the series-level route
 * surface relies on. A series of another space is not found without a query.
 */
export const loadLastSeriesAlertEventOrThrow = async ({
  queryService,
  spaceId,
  seriesId,
  series,
}: LoadLastSeriesAlertEventParams): Promise<AlertEventRecord> => {
  const events = await loadLatestAlertEventsBySeries({ queryService, spaceId, series: [series] });
  // The owner and hash filter can also match events of another series (the same rule id with
  // an external source), which ES|QL groups apart, so the requested series is picked by its id.
  const requestedSeriesId = encodeSeriesId(series);
  const event = requestedSeriesId ? events.get(requestedSeriesId) : undefined;

  if (!event) {
    throw getSeriesNotFoundError(seriesId);
  }

  return event;
};

interface LoadLastEpisodeAlertEventParams {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeId: string;
}

/**
 * Single-episode adapter over {@link loadLatestAlertEventsByEpisodeId}:
 * returns the most recent `.rule-events` row for one `episode.id` or throws
 * `Boom.notFound` with the canonical `ALERT_EPISODE_NOT_FOUND` shape the
 * episode-level route surface relies on.
 */
export const loadLastEpisodeAlertEventOrThrow = async ({
  queryService,
  spaceId,
  episodeId,
}: LoadLastEpisodeAlertEventParams): Promise<AlertEventRecord> => {
  const events = await loadLatestAlertEventsByEpisodeId({
    queryService,
    spaceId,
    episodeIds: [episodeId],
  });

  if (events.length === 0) {
    throw Boom.notFound(getAlertEpisodeNotFoundMessage(episodeId), {
      code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
      details: { alert_id: episodeId },
    });
  }

  return events[0];
};
