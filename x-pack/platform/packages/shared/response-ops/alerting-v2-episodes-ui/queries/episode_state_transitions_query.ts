/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';

export interface EpisodeStateTransitionRow {
  '@timestamp': string;
  'episode.status': AlertEpisodeStatus;
  event_count: number;
}

const ALERT_EPISODE_STATE_TRANSITION_FIELDS = [
  '@timestamp',
  'episode.status',
  'event_count',
] as const;

/**
 * ES|QL query returning the minimal chronological status series needed to derive
 * state transitions for a single alert episode.
 */
export const buildEpisodeStateTransitionsEsqlQuery = (spaceId: string, episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`STATS event_count = COUNT(*) BY @timestamp, \`episode.status\``
    .sort([TIME_FIELD, 'ASC'])
    .keep(...ALERT_EPISODE_STATE_TRANSITION_FIELDS);
};
