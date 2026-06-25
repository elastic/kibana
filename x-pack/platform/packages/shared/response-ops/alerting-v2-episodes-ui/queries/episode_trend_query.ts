/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';

export interface EpisodeTrendRow {
  '@timestamp': string;
  'episode.status': AlertEpisodeStatus;
  /** JSON string of the alert event's evaluated `data` row, or `"{}"` for status-only events. */
  extracted_data: string | null;
}

/**
 * ES|QL query returning every `.rule-events` event for an episode (oldest first),
 * carrying the lifecycle status and the rule's evaluated `data` row for that
 * execution. Unlike a re-aggregation of the source index, these are the exact
 * values the rule evaluated, at the timestamps it evaluated them — and they are
 * already scoped to the episode's group via `episode.id`.
 *
 * `METADATA _source` lets `JSON_EXTRACT` read the flattened `data` field as a JSON
 * string, which the caller parses per stat label.
 */
export const buildEpisodeTrendQuery = (spaceId: string, episodeId: string) => {
  // prettier-ignore
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .sort([TIME_FIELD, 'ASC'])
    .keep('@timestamp', 'episode.status', 'extracted_data');
};
