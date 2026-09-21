/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

export interface EpisodeActionRow {
  episode_id: string;
  rule_id: string | null;
  group_hash: string | null;
  last_ack_action: string | null;
  last_assignee_uid: string | null;
  last_ack_actor: string | null;
}

export const buildEpisodeActionsQuery = (
  spaceId: string,
  episodeIds: string[]
): TypedEsqlQuery<EpisodeActionRow> => {
  const episodeIdLiterals = episodeIds.map((id) => esql.str(id));

  // prettier-ignore
  return asTypedEsqlQuery<EpisodeActionRow>(
    esql.from(ALERT_ACTIONS_DATA_STREAM)
      .where`space_id == ${spaceId}`
      .where`alert_id IN (${episodeIdLiterals})`
      .where`action_type IN ("ack", "unack", "assign")`
      .pipe`EVAL
        ack_action = CASE(action_type IN ("ack", "unack"), action_type, null),
        assignee_value = CASE(action_type == "assign", assignee_uid, null),
        ack_actor = CASE(action_type == "ack", actor, null)`
      .pipe`STATS
        last_ack_action = LAST(ack_action, @timestamp),
        last_assignee_uid = LAST(assignee_value, @timestamp),
        last_ack_actor = LAST(ack_actor, @timestamp)
        BY alert_id, rule_id, group_hash`
      // Temporary projection: renames alert_id back to episode_id so UI row-readers
      // don't need to change in this PR. Remove in follow-up U2.
      .pipe`RENAME alert_id AS episode_id`
      .keep('episode_id', 'rule_id', 'group_hash', 'last_ack_action', 'last_assignee_uid', 'last_ack_actor')
  );
};
