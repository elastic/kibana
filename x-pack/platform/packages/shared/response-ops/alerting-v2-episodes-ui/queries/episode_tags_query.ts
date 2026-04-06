/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, TIME_FIELD } from '../constants';

export interface LatestAlertAction {
  '@timestamp': string;
  episode_id: string;
  tags: string | string[] | null;
}

const LATEST_ALERT_ACTION_FIELDS = ['@timestamp', 'episode_id', 'tags'] as const;

/**
 * ES|QL query returning the latest `.alert-actions` document for an episode.
 */
export const buildGetLastAlertActionEsqlQuery = (episodeId: string) => {
  // prettier-ignore
  return esql.from(ALERT_ACTIONS_DATA_STREAM)
    .where`episode_id == ${episodeId}`
    .sort([TIME_FIELD, 'DESC'])
    .limit(1)
    .keep(...LATEST_ALERT_ACTION_FIELDS);
};
