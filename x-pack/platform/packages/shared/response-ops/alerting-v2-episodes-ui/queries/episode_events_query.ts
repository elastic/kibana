/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';

export interface EpisodeEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  'rule.version'?: number;
  group_hash: string;
  status: string;
  grouping_fields?: string;
  source?: string;
  scheduled_timestamp?: string;
  event_data?: string;
}

const ALERT_EPISODE_EVENT_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'rule.version',
  'group_hash',
  'status',
  'grouping_fields',
  'source',
  'scheduled_timestamp',
  'event_data',
] as const;

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 * Uses `_source` metadata + JSON_EXTRACT to include the flattened `data` field
 * as a JSON string named `event_data` (ES|QL cannot KEEP flattened fields directly).
 */
export const buildEpisodeEventsEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source']).where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`EVAL event_data = JSON_EXTRACT(_source, "data")`
    .sort([TIME_FIELD, 'ASC'])
    .keep(...ALERT_EPISODE_EVENT_FIELDS);
};
