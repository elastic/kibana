/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@kbn/esql-language';
import type { AlertEventStatus, AlertEpisodeStatus } from '../../resources/alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';

interface GetActiveAlertGroupHashesQueryParams {
  ruleId: string;
}

export interface ActiveAlertGroupHash {
  group_hash: string;
}

/**
 * Returns all group hashes for a rule that are currently in a non-inactive episode state
 * (pending, active, or recovering). Used to detect which alerts need recovery events.
 */
export const getActiveAlertGroupHashesQuery = ({
  ruleId,
}: GetActiveAlertGroupHashesQueryParams): ComposerQuery => {
  let query = esql.from(ALERT_EVENTS_DATA_STREAM);

  query = query.where`rule.id == ${{ ruleId }}`;

  query = query.pipe`STATS 
      last_episode_status = LAST(episode.status, @timestamp)
    BY group_hash`;

  query = query.where`last_episode_status IN ("pending", "active", "recovering")`;

  query = query.keep('group_hash');

  return query;
};

interface GetLatestAlertEventStateQueryParams {
  ruleId: string;
  groupHashes: string[];
}

export interface LatestAlertEventState {
  last_status: AlertEventStatus;
  last_episode_id: string | null;
  last_episode_status: AlertEpisodeStatus | null;
  last_episode_status_count: number | null;
  last_episode_timestamp: string | null;
  group_hash: string;
}

export const getLatestAlertEventStateQuery = ({
  ruleId,
  groupHashes,
}: GetLatestAlertEventStateQueryParams): ComposerQuery => {
  let query = esql.from(ALERT_EVENTS_DATA_STREAM);

  query = query.where`rule.id == ${{ ruleId }} AND group_hash IN (${{ groupHashes }})`;

  query = query.pipe`STATS 
      last_status = LAST(status, @timestamp), 
      last_episode_id = LAST(episode.id, @timestamp), 
      last_episode_status = LAST(episode.status, @timestamp),
      last_episode_status_count = LAST(episode.status_count, @timestamp),
      last_episode_timestamp = MAX(@timestamp)
    BY group_hash`;

  query = query.keep(
    'last_status',
    'last_episode_id',
    'last_episode_status',
    'last_episode_status_count',
    'last_episode_timestamp',
    'group_hash'
  );

  return query;
};
