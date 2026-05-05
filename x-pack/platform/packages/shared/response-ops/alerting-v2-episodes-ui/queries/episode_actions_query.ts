/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../constants';

export interface AlertEpisodeAction {
  episode_id: string;
  rule_id: string | null;
  group_hash: string | null;
  last_ack_action: string | null;
  last_assignee_uid: string | null;
  last_ack_actor: string | null;
}

export const buildEpisodeActionsQuery = (episodeIds: string[]) => {
  const episodeIdLiterals = episodeIds.map((id) => esql.str(id));

  // prettier-ignore
  return esql.from(ALERT_ACTIONS_DATA_STREAM)
    .where`episode_id IN (${episodeIdLiterals})`
    .where`action_type IN ("ack", "unack", "assign")`
    .pipe`EVAL
      ack_action = CASE(action_type IN ("ack", "unack"), action_type, null),
      assignee_value = CASE(action_type == "assign", assignee_uid, null),
      ack_actor = CASE(action_type == "ack", actor, null)`
    .pipe`STATS
      last_ack_action = LAST(ack_action, @timestamp),
      last_assignee_uid = LAST(assignee_value, @timestamp),
      last_ack_actor = LAST(ack_actor, @timestamp)
      BY episode_id, rule_id, group_hash`
    .keep('episode_id', 'rule_id', 'group_hash', 'last_ack_action', 'last_assignee_uid', 'last_ack_actor');
};
