/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';
import { DEFAULT_EPISODE_FLAPPING_SETTINGS } from '../utils/is_episode_flapping';

export interface EpisodeFlappingRow {
  'episode.status': AlertEpisodeStatus;
}

const ALERT_EPISODE_FLAPPING_FIELDS = ['episode.status'] as const;

/**
 * ES|QL query returning the most recent `limit` rule-event statuses for a single
 * episode, newest first. Callers reverse the rows to restore chronological order.
 *
 * Unlike the shared oldest-first {@link buildEpisodeEventsEsqlQuery}, this sorts
 * `@timestamp` DESC with an explicit LIMIT so the flapping look-back always
 * reflects the genuinely latest events. Reusing the unbounded ascending query
 * would hit ES|QL's implicit `LIMIT 1000` and return the oldest 1000 rows for
 * long-running episodes, making the "most recent" look-back window stale.
 */
export const buildEpisodeFlappingEsqlQuery = (
  spaceId: string,
  episodeId: string,
  limit: number = DEFAULT_EPISODE_FLAPPING_SETTINGS.lookBackWindow
) => {
  // prettier-ignore
  return esql.from([ALERT_EVENTS_DATA_STREAM])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .sort([TIME_FIELD, 'DESC'])
    .keep(...ALERT_EPISODE_FLAPPING_FIELDS)
    .limit(limit);
};
