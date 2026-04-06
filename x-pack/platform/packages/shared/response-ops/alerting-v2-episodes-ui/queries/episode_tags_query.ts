/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, TIME_FIELD } from '../constants';

/**
 * ES|QL query returning the latest `.alert-actions` document for an episode (for tags).
 */
export const buildEpisodeTagsEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_ACTIONS_DATA_STREAM)
    .where`episode_id == ${episodeId}`
    .sort([TIME_FIELD, 'DESC'])
    .limit(1);
};
