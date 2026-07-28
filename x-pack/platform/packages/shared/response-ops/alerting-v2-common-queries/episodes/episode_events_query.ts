/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from './constants';

export const ALERT_EPISODE_EVENT_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'severity',
  'data',
] as const;

export const buildEpisodeEventsQuery = (spaceId: string, episodeId: string): ComposerQuery => {
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`EVAL data = JSON_EXTRACT(_source, "$.data")`
    .sort([TIME_FIELD, 'ASC'])
    .keep(...ALERT_EPISODE_EVENT_FIELDS);
};
