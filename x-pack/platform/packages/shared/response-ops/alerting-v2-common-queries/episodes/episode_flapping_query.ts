/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD, DEFAULT_FLAPPING_LOOKBACK } from './constants';

export const buildEpisodeFlappingQuery = (
  spaceId: string,
  episodeId: string,
  limit: number = DEFAULT_FLAPPING_LOOKBACK
): ComposerQuery => {
  return esql.from([ALERT_EVENTS_DATA_STREAM])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .sort([TIME_FIELD, 'DESC'])
    .keep('episode.status')
    .limit(limit);
};
