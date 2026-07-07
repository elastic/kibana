/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/datastreams/alert_events';

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

  query = query.where`rule.id == ${{ ruleId }} AND episode.status IS NOT NULL`;

  query = query.pipe`STATS 
      last_episode_status = LAST(episode.status, @timestamp)
    BY group_hash`;

  query = query.where`last_episode_status IN ("pending", "active", "recovering")`;

  query = query.keep('group_hash');

  return query;
};
