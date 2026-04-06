/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export const buildEpisodeEventsEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .sort([TIME_FIELD, 'ASC']);
};
