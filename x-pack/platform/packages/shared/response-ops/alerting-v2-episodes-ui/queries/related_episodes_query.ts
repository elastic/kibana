/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';
import { addEpisodeAggregation, ALERT_EPISODE_FIELDS } from './episodes_query';

/**
 * ES|QL query listing alert episodes for a rule, excluding one episode id.
 * Temporarily limited to 5 episodes.
 */
export const buildRelatedAlertEpisodesEsqlQuery = (ruleId: string, excludeEpisodeId: string) => {
  const query = esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`rule.id == ${ruleId} AND episode.id != ${excludeEpisodeId}`;

  addEpisodeAggregation(query);

  // prettier-ignore
  return query
    .sort([TIME_FIELD, 'DESC'])
    .limit(5)
    .keep(...ALERT_EPISODE_FIELDS);
};
