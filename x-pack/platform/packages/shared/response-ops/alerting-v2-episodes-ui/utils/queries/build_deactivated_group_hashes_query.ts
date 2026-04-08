/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

import { ALERT_ACTIONS_DATA_STREAM } from '../../constants';

/**
 * Builds an ES|QL query that returns all group hashes where the most recent
 * deactivate/activate action is "deactivate" (i.e., the group is currently resolved).
 */
export const buildDeactivatedGroupHashesQuery = (): string => {
  return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE action_type IN ("deactivate", "activate")
    | STATS last_deactivate_action = LAST(action_type, @timestamp) BY group_hash
    | WHERE last_deactivate_action == "deactivate"
    | KEEP group_hash
  `.print('basic');
};
