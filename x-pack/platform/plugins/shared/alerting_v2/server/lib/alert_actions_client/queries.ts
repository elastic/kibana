/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type EsqlRequest } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/datastreams/alert_actions';

export const getBulkGetAlertActionsQuery = (episodeIds: string[]): EsqlRequest => {
  const episodeIdValues = episodeIds.map((id) => esql.str(id));

  return esql`
    FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE episode_id IN (${episodeIdValues})
    | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "tag", "unsnooze")
    | STATS
        tags = LAST(tags, @timestamp) WHERE action_type IN ("tag"),
        last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
      BY episode_id, rule_id, group_hash
    | KEEP episode_id, rule_id, group_hash, last_ack_action, last_deactivate_action, last_snooze_action, tags
  `.toRequest();
};
