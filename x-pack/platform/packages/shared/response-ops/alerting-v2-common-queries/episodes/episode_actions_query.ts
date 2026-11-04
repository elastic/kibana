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
  alert_id: string;
  rule_id: string | null;
  group_hash: string | null;
  last_ack_action: string | null;
  last_assignee_uid: string | null;
  last_ack_actor: string | null;
  last_deactivate_action: string | null;
  last_deactivate_actor: string | null;
  last_tags?: string | string[] | null;
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
      .where`action_type IN ("ack", "unack", "assign", "deactivate", "activate", "tag")`
      .pipe`STATS
        last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign",
        last_ack_actor = LAST(actor.profile_uid, @timestamp) WHERE action_type == "ack",
        last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
        last_deactivate_actor = LAST(actor.profile_uid, @timestamp) WHERE action_type == "deactivate",
        last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"
        BY alert_id, rule_id, group_hash`
      .keep('alert_id', 'rule_id', 'group_hash', 'last_ack_action', 'last_assignee_uid', 'last_ack_actor', 'last_deactivate_action', 'last_deactivate_actor', 'last_tags')
  );
};
