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
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import { ALERTING_V2_ERROR_CODES } from '../../errors/error_codes';
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
    throw Boom.notFound(
      `Alert event with group_hash [${groupHash}] and episode_id [${episodeId}] not found`,
      {
        code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
        details: {
          group_hash: groupHash,
          ...(episodeId ? { episode_id: episodeId } : {}),
        },
      }
    );
  }

  return events[0];
};
