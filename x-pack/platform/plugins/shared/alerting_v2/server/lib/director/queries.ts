/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@kbn/esql-language';
import type { AlertEventStatus, EpisodeStatus } from '../../resources/alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';

interface GetLatestAlertEventStateQueryParams {
  ruleId: string;
  groupHashes: string[];
}

export interface LatestAlertEventState extends Record<string, unknown> {
  last_status: AlertEventStatus;
  last_episode_id: string | null;
  last_episode_status: EpisodeStatus | null;
  group_hash: string;
}

export const getLatestAlertEventStateQuery = ({
  ruleId,
  groupHashes,
}: GetLatestAlertEventStateQueryParams): ComposerQuery => {
  let query = esql.from(ALERT_EVENTS_DATA_STREAM);

  query = query.where`rule.id == ${{ ruleId }}`;

  const groupHashList = groupHashes.map((hash) => `"${hash}"`).join(', ');
  query = query.pipe(`WHERE rule.id == ${ruleId} AND group_hash IN (${groupHashList})`);

  query = query.pipe`STATS 
      last_status = LAST(status, @timestamp), 
      last_episode_id = LAST(episode.id, @timestamp), 
      last_episode_status = LAST(episode.status, @timestamp) 
    BY group_hash`;

  query = query.keep('last_status', 'last_episode_id', 'last_episode_status', 'group_hash');

  return query;
};
