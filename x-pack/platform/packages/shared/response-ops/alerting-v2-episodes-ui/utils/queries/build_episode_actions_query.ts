/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

import { ALERT_ACTIONS_DATA_STREAM } from './constants';

export const buildEpisodeActionsQuery = (episodeIds: string[]): string => {
  const episodeIdLiterals = episodeIds.map((id) => esql.str(id));

  return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE episode_id IN (${episodeIdLiterals})
    | WHERE action_type IN ("ack", "unack")
    | STATS
        last_ack_action = LAST(action_type, @timestamp)
      BY episode_id, rule_id, group_hash
    | KEEP episode_id, rule_id, group_hash, last_ack_action
  `.print('basic');
};
