/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { BulkCreateAlertActionItemBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import {
  getAlertEpisodeNotFoundMessage,
  getAlertEventNotFoundMessage,
  getAlertSeriesNotFoundMessage,
} from '../../errors/alert_error_messages';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import type { AlertEventRecord, RawAlertEventRow } from '../types';
import { parseDataJson } from '../utils/parse_data_json';

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

/**
 * One alert-event target: a `group_hash` (always required) plus an optional
 * `episode_id` narrowing. Omitting `episode_id` means "latest event for any
 * episode of this group"; including it means "latest event for this exact
 * episode" — the shape both the single-action route and the bulk route
 * already speak.
 */
export interface AlertEventTarget {
  groupHash: string;
  episodeId?: string;
}

interface LoadLatestAlertEventsParams {
  queryService: QueryServiceContract;
  spaceId: string;
  targets: readonly AlertEventTarget[];
}

/**
 * Resolves the latest `.rule-events` row per (`group_hash`, optional
 * `episode_id`) target in a single ES|QL round-trip. The projection is the
 * canonical {@link AlertEventRecord} shape every handler consumes — no
 * branching by caller.
 *
 * This is the only ES|QL definition for "latest alert event(s)" in the
 * client; the single-event throw-on-empty path
 * ({@link loadLastAlertEventOrThrow}) and the bulk route's adapter
 * ({@link bulkLoadLatestAlertEvents}) both delegate here so the projection
 * can't drift between the two surfaces.
 *
 * Items whose group has no matching event simply don't appear in the
 * result; callers that need throw-on-empty semantics layer that on top.
 */
export const loadLatestAlertEvents = async ({
  queryService,
  spaceId,
  targets,
}: LoadLatestAlertEventsParams): Promise<AlertEventRecord[]> => {
  if (targets.length === 0) {
    return [];
  }

  // Build a disjunction of `(group_hash == "h" AND episode.id == "e")` per
  // target (or `(group_hash == "h" AND TRUE)` when the target doesn't
  // narrow to an episode), starting from `FALSE` so the chain stays
  // well-formed for a single-target input.
  let whereClause = esql.exp`FALSE`;
  for (const target of targets) {
    whereClause = esql.exp`${whereClause} OR (group_hash == ${target.groupHash} AND ${
      target.episodeId !== undefined ? esql.exp`episode.id == ${target.episodeId}` : esql.exp`TRUE`
    })`;
  }

  const query = esql`
    FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
    | WHERE type == "alert" AND space_id == ${spaceId} AND (${whereClause})
    | EVAL data_json = JSON_EXTRACT(_source, "$.data")
    | DROP _source
    | STATS
        @timestamp = MAX(@timestamp),
        episode_id = LAST(episode.id, @timestamp),
        episode_status = LAST(episode.status, @timestamp),
        episode_status_count = LAST(episode.status_count, @timestamp),
        data_json = LAST(data_json, @timestamp),
        severity = LAST(severity, @timestamp),
        status = LAST(status, @timestamp),
        source = LAST(source, @timestamp),
        rule_id = LAST(rule.id, @timestamp),
        rule_version = LAST(rule.version, @timestamp)
      BY group_hash, space_id
    | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, source, data_json, severity
  `.toRequest();

  return toAlertEventRecords(await queryService.executeQuery({ query: query.query }));
};

interface LoadLatestAlertEventsByGroupHashParams {
  queryService: QueryServiceContract;
  spaceId: string;
  groupHashes: readonly string[];
}

/**
 * Resolves the latest `.rule-events` row per series (`group_hash`) in a
 * single ES|QL round-trip. Series that have no matching event simply don't
 * appear in the result; callers that need throw-on-empty semantics layer
 * that on top ({@link loadLastSeriesAlertEventOrThrow}).
 */
export const loadLatestAlertEventsByGroupHash = async ({
  queryService,
  spaceId,
  groupHashes,
}: LoadLatestAlertEventsByGroupHashParams): Promise<AlertEventRecord[]> => {
  if (groupHashes.length === 0) {
    return [];
  }

  const groupHashValues = [...new Set(groupHashes)].map((groupHash) => esql.str(groupHash));

  const query = esql`
    FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
    | WHERE type == "alert" AND space_id == ${spaceId} AND group_hash IN (${groupHashValues})
    | EVAL data_json = JSON_EXTRACT(_source, "$.data")
    | DROP _source
    | STATS
        @timestamp = MAX(@timestamp),
        episode_id = LAST(episode.id, @timestamp),
        episode_status = LAST(episode.status, @timestamp),
        episode_status_count = LAST(episode.status_count, @timestamp),
        data_json = LAST(data_json, @timestamp),
        severity = LAST(severity, @timestamp),
        status = LAST(status, @timestamp),
        source = LAST(source, @timestamp),
        rule_id = LAST(rule.id, @timestamp),
        rule_version = LAST(rule.version, @timestamp)
      BY group_hash, space_id
    | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, source, data_json, severity
  `.toRequest();

  return toAlertEventRecords(await queryService.executeQuery({ query: query.query }));
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
  groupHash: string;
}

/**
 * Single-series adapter over {@link loadLatestAlertEventsByGroupHash}:
 * returns the most recent `.rule-events` row for one `group_hash` or throws
 * `Boom.notFound` with the canonical `ALERT_EVENT_NOT_FOUND` shape the
 * series-level route surface relies on.
 */
export const loadLastSeriesAlertEventOrThrow = async ({
  queryService,
  spaceId,
  groupHash,
}: LoadLastSeriesAlertEventParams): Promise<AlertEventRecord> => {
  const events = await loadLatestAlertEventsByGroupHash({
    queryService,
    spaceId,
    groupHashes: [groupHash],
  });

  if (events.length === 0) {
    throw Boom.notFound(getAlertSeriesNotFoundMessage(groupHash), {
      code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
      details: { group_hash: groupHash },
    });
  }

  return events[0];
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
      details: { episode_id: episodeId },
    });
  }

  return events[0];
};

interface BulkLoadLatestAlertEventsParams {
  queryService: QueryServiceContract;
  spaceId: string;
  actions: readonly BulkCreateAlertActionItemBody[];
}

/**
 * Bulk-route adapter over {@link loadLatestAlertEvents}. Maps each
 * `BulkCreateAlertActionItemBody` to a generic {@link AlertEventTarget}
 * (so the loader doesn't need to know the bulk-request schema) and
 * delegates. Items targeting a specific `episode_id` whose group's latest
 * event belongs to a different episode are filtered out by the caller's
 * post-query pairing step — that policy stays out of the loader.
 */
export const bulkLoadLatestAlertEvents = ({
  queryService,
  spaceId,
  actions,
}: BulkLoadLatestAlertEventsParams): Promise<AlertEventRecord[]> =>
  loadLatestAlertEvents({
    queryService,
    spaceId,
    targets: actions.map((action) => ({
      groupHash: action.group_hash,
      episodeId: 'episode_id' in action ? action.episode_id : undefined,
    })),
  });

interface LoadLastAlertEventParams {
  queryService: QueryServiceContract;
  spaceId: string;
  groupHash: string;
  /**
   * When provided, narrows the lookup to that specific episode. Required
   * for actions that target a non-latest episode (e.g. `activate`); omitted
   * for the natural "latest episode of this group" case.
   */
  episodeId?: string;
}

/**
 * Single-target adapter over {@link loadLatestAlertEvents}: returns the
 * most recent `.rule-events` row for one (`group_hash`, optional
 * `episode_id`) or throws `Boom.notFound` with the canonical
 * `ALERT_EVENT_NOT_FOUND` shape. The single-action route surface depends
 * on this exact error shape, so it lives here (next to the throw) rather
 * than inline at each call site.
 *
 * Callers in the bulk path that prefer silent-skip semantics must use
 * {@link loadLatestAlertEvents} (or {@link bulkLoadLatestAlertEvents})
 * directly.
 */
export const loadLastAlertEventOrThrow = async ({
  queryService,
  spaceId,
  groupHash,
  episodeId,
}: LoadLastAlertEventParams): Promise<AlertEventRecord> => {
  const events = await loadLatestAlertEvents({
    queryService,
    spaceId,
    targets: [{ groupHash, episodeId }],
  });

  if (events.length === 0) {
    throw Boom.notFound(getAlertEventNotFoundMessage(groupHash, episodeId), {
      code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
      details: {
        group_hash: groupHash,
        ...(episodeId ? { episode_id: episodeId } : {}),
      },
    });
  }

  return events[0];
};
