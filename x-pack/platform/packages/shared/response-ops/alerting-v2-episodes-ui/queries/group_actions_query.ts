/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../constants';

export interface GroupActionRow {
  group_hash: string;
  rule_id: string | null;
  last_deactivate_action: string | null;
  last_snooze_action: string | null;
  snooze_expiry: string | null;
  tags: string | string[] | null;
  last_snooze_actor: string | null;
  last_deactivate_actor: string | null;
}

export const buildGroupActionsQuery = (groupHashes: string[]) => {
  const groupHashLiterals = groupHashes.map((h) => esql.str(h));
  // prettier-ignore
  return esql.from(ALERT_ACTIONS_DATA_STREAM)
    .where`group_hash IN (${groupHashLiterals})`
    .where`action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag")`
    .pipe`STATS
        tags = LAST(tags, @timestamp) WHERE action_type IN ("tag"),
        last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
        snooze_expiry = LAST(expiry, @timestamp) WHERE action_type IN ("snooze"),
        last_snooze_actor = LAST(actor, @timestamp) WHERE action_type == "snooze",
        last_deactivate_actor = LAST(actor, @timestamp) WHERE action_type == "deactivate"
      BY group_hash, rule_id`
    .keep('group_hash', 'rule_id', 'last_deactivate_action', 'last_snooze_action', 'snooze_expiry', 'tags', 'last_snooze_actor', 'last_deactivate_actor');
};
