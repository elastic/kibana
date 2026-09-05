/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

export interface EpisodeTransitionEsqlRow {
  'episode.id': string;
  'rule.id': string;
  group_hash: string;
  status_started_at: string;
  previous_status: AlertEpisodeStatus | null;
  episode_status: AlertEpisodeStatus;
  duration_ms: number;
  status_ended_at: string | null;
  data?: string | Record<string, unknown> | null;
}

/**
 * ES|QL query returning one row per contiguous `episode.status` run for a
 * single episode: start, previous status, duration, optional end, and the
 * alert `data` at the transition. Consecutive events with the same status
 * collapse into a single row.
 */
export const buildEpisodeTransitionsQuery = (
  spaceId: string,
  episodeId: string
): TypedEsqlQuery<EpisodeTransitionEsqlRow> => {
  // prettier-ignore
  return asTypedEsqlQuery<EpisodeTransitionEsqlRow>(
    esql.from([ALERT_EVENTS_DATA_STREAM], ['_id'])
      .where`type == "alert"`
      .where`space_id == ${spaceId}`
      .where`episode.id == ${episodeId}`
      .pipe`WHERE \`episode.status\` IS NOT NULL`
      .pipe`EVAL _entry = CONCAT(DATE_FORMAT("yyyyMMddHHmmssSSS", @timestamp), \`episode.status\`)`
      .pipe`INLINE STATS episode_latest_ts = MAX(@timestamp), _candidates = VALUES(_entry) BY \`episode.id\``
      .pipe`MV_EXPAND _candidates`
      .pipe`STATS _prev = MAX(CASE(_candidates < _entry, _candidates, null))
    BY _id, \`episode.id\`, \`rule.id\`, group_hash, @timestamp, \`episode.status\`, data, episode_latest_ts`
      .pipe`EVAL previous_status = SUBSTRING(_prev, 18)`
      .pipe`WHERE _prev IS NULL OR previous_status != \`episode.status\``
      .pipe`INLINE STATS _transition_ts = VALUES(@timestamp) BY \`episode.id\``
      .pipe`MV_EXPAND _transition_ts`
      .pipe`STATS status_ended_at = MIN(CASE(_transition_ts > @timestamp, _transition_ts, null))
    BY _id, \`episode.id\`, \`rule.id\`, group_hash, @timestamp, previous_status, \`episode.status\`, data, episode_latest_ts`
      .pipe`EVAL duration_ms = DATE_DIFF("ms", @timestamp, COALESCE(status_ended_at, episode_latest_ts))`
      .pipe`RENAME @timestamp AS status_started_at, \`episode.status\` AS episode_status`
      .keep(
        'episode.id',
        'rule.id',
        'group_hash',
        'status_started_at',
        'previous_status',
        'episode_status',
        'duration_ms',
        'status_ended_at',
        'data'
      )
      .pipe`SORT \`episode.id\` ASC, status_started_at ASC`
  );
};
