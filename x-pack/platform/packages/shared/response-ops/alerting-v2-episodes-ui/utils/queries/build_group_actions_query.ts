/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

import { ALERT_ACTIONS_DATA_STREAM } from './constants';

export const buildGroupActionsQuery = (groupHashes: string[]): string => {
  const groupHashLiterals = groupHashes.map((h) => esql.str(h));

  return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE group_hash IN (${groupHashLiterals})
    | WHERE action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag")
    | STATS
        tags = LAST(tags, @timestamp) WHERE action_type IN ("tag"),
        last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
        snooze_expiry = LAST(expiry, @timestamp) WHERE action_type IN ("snooze")
      BY group_hash, rule_id
    | KEEP group_hash, rule_id, last_deactivate_action, last_snooze_action, snooze_expiry, tags
  `.print('basic');
};
