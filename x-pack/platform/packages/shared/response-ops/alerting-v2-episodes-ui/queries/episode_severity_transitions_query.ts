/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';

export interface EpisodeSeverityTransitionRow {
  '@timestamp': string;
  severity: string;
  event_count: number;
}

const ALERT_EPISODE_SEVERITY_TRANSITION_FIELDS = ['@timestamp', 'severity', 'event_count'] as const;

/**
 * ES|QL query returning the minimal chronological severity series needed to derive
 * severity transitions for a single alert episode.
 */
export const buildEpisodeSeverityTransitionsEsqlQuery = (spaceId: string, episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .where`severity IS NOT NULL`
    .pipe`STATS event_count = COUNT(*) BY @timestamp, severity`
    .sort([TIME_FIELD, 'ASC'])
    .keep(...ALERT_EPISODE_SEVERITY_TRANSITION_FIELDS);
};
