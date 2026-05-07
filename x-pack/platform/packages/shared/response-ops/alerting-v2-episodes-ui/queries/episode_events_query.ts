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
  group_hash: string;
}

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 * Returns all fields so expanded views can display the full event document.
 */
export const buildEpisodeEventsEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .sort([TIME_FIELD, 'ASC']);
};
