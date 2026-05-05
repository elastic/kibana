/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '../constants';

export interface EpisodeEventDataRow {
  'episode.id': string;
  last_data: string | null;
  last_data_timestamp: string | null;
  last_event_timestamp: string | null;
}

/**
 * ES|QL query that extracts the alert `data` object from the latest non-empty
 * `.rule-events` document for the given episode, alongside the timestamp of
 * that data event and the timestamp of the most recent event overall.
 *
 * Uses `METADATA _source` so `JSON_EXTRACT` can access the full document source.
 * `INLINE STATS LAST(...) WHERE extracted_data != "{}"` skips status-only events
 * (e.g. inactive/recovered) whose `data` field is empty, returning the last event
 * that carried actual alert evaluation data. `last_event_timestamp` (no WHERE)
 * lets callers detect when the displayed data is stale relative to the latest
 * event (e.g. after recovery).
 */
export const buildEpisodeEventDataQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .pipe`INLINE STATS
      last_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}",
      last_data_timestamp = MAX(@timestamp) WHERE extracted_data != "{}",
      last_event_timestamp = MAX(@timestamp)
      BY \`episode.id\``;
};
