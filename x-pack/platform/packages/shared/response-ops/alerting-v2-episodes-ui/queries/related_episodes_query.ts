/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ComposerQuery } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';
import { addEpisodeAggregation, ALERT_EPISODE_FIELDS } from './episodes_query';

const RELATED_EPISODE_LIMIT = 5;

export const finishRelatedEpisodesQuery = (query: ComposerQuery) => {
  addEpisodeAggregation(query);

  return query
    .sort([TIME_FIELD, 'DESC'])
    .limit(RELATED_EPISODE_LIMIT)
    .keep(...ALERT_EPISODE_FIELDS);
};

export const buildRelatedBaseQuery = (ruleId: string, excludeEpisodeId: string) => {
  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`rule.id == ${ruleId} AND episode.id != ${excludeEpisodeId}`;
};
