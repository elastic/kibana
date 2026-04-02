/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_FIELD } from '../constants';
import { buildAlertEventsBaseQuery } from './alert_events_query';

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export const buildEpisodeEventsEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return buildAlertEventsBaseQuery()
    .where`episode.id == ${episodeId}`
    .sort([TIME_FIELD, 'ASC']);
};
