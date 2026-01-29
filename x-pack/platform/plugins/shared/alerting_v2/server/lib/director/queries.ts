/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@kbn/esql-language';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';

interface GetLatestEventStateParams {
  ruleId: string;
}

export const getLatestEventState = ({ ruleId }: GetLatestEventStateParams): ComposerQuery => {
  let query = esql.from(ALERT_EVENTS_DATA_STREAM);

  query = query.where`rule_id == ${{ ruleId }}`;

  query = query.pipe`STATS last_status = LAST(status, @timestamp), last_episode_id = LAST(episode_id, @timestamp) BY group_hash`;

  query = query.pipe`EVAL next_state = CASE(
      current_state == "inactive" AND last_signal_status == "breach", "pending",
      current_state == "pending" AND last_signal_status == "breach", "active",
      (current_state == "active" OR current_state == "pending") AND (last_signal_status == "recover" OR is_stale), "inactive",
     "inactive"
  )`;

  query = query.pipe`EVAL 
      event.kind = "state_change",
      state.prev = current_state,
      state.curr = next_state,
      state.episode_id = IF(current_state == "inactive", TO_STRING(UUID()), current_episode_id)`;

  query = query.keep('rule_id', 'group_hash');

  return query;
};
