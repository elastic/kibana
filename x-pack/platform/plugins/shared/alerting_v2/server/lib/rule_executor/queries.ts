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
 * (pending, active, or recovering). Used to detect which alerts need recovery or no_data events.
 *
 * TODO(alerting-v2): decide whether `no_data` belongs in this set.
 *
 * Today a group whose last episode is `no_data` is inert — neither the recovery
 * step nor the no-data step re-evaluates it until a fresh `breached` event
 * arrives (the soft-reset `no_data → pending`). Two consequences:
 *   1) `.rule-events` records exactly one `no_data` event per data gap (the
 *      moment of entry); subsequent runs are silent until data returns.
 *   2) The FSM's `no_data + recovered → inactive` transition is unreachable —
 *      no rule event is ever emitted that would trigger it.
 *
 * Including `"no_data"` would make both subsequent `no_data` events and
 * recovery-from-no_data possible, but the recovery step would also need to
 * become aware of `no_data_strategy` so it doesn't auto-recover groups the
 * user explicitly chose to hold (e.g. `no_data_strategy: 'emit'`).
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
