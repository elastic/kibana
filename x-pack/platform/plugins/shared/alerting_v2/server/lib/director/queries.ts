/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type {
  AlertEventStatus,
  AlertEpisodeStatus,
} from '../../resources/datastreams/alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/datastreams/alert_events';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/datastreams/alert_actions';

interface GetLatestAlertEventStateQueryParams {
  ruleId: string;
  groupHashes: string[];
}

/**
 * Latest lifecycle action a user performed on a group_hash.
 *
 * `activate` means the episode is currently user-owned and the director must
 * hold it in `active` regardless of what the strategy computes (see
 * DirectorService.getAlertEventWithNextEpisode). `deactivate` and `null`
 * (no lifecycle action ever, or only pre-`activate` history) both mean
 * "no user lock" — the strategy owns the transition.
 */
export type LastLifecycleActionType =
  | typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE
  | typeof ALERT_EPISODE_ACTION_TYPE.DEACTIVATE
  | null;

export interface LatestAlertEventState {
  last_status: AlertEventStatus;
  last_episode_id: string | null;
  last_episode_status: AlertEpisodeStatus | null;
  last_episode_status_count: number | null;
  last_episode_timestamp: string | null;
  last_lifecycle_action_type: LastLifecycleActionType;
  group_hash: string;
}

/**
 * Single-round-trip lookup of both the latest `.rule-events` episode state
 * and the latest lifecycle user action (`activate` / `deactivate`) from
 * `.alert-actions` for a set of group_hashes.
 *
 * Combining the two streams in one `FROM` lets each aggregation filter to
 * the rows it actually cares about (per-aggregation `WHERE`), so we avoid
 * a separate audit-stream round-trip per director tick.
 *
 * Cross-stream field name reconciliation:
 * - `.rule-events` uses nested `rule.id`; `.alert-actions` uses flat
 *   `rule_id`. The `OR` in the top-level `WHERE` accepts either.
 * - `.alert-actions` rows carry `action_type` and no `type`/`episode.status`,
 *   so `type == "alert" AND episode.status IS NOT NULL` naturally scopes
 *   the rule-events aggregations to their own stream, and the
 *   `action_type IN (...)` filter naturally scopes the audit aggregation
 *   to lifecycle actions.
 */
export const getLatestAlertEventStateQuery = ({
  ruleId,
  groupHashes,
}: GetLatestAlertEventStateQueryParams): ComposerQuery => {
  const groupHashValues = groupHashes.map((hash) => esql.str(hash));

  let query = esql.from([ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM]);

  query = query.where`(rule.id == ${{
    ruleId,
  }} OR rule_id == ${{
    ruleId,
  }}) AND group_hash IN (${groupHashValues})`;

  query = query.pipe`STATS
      last_status = LAST(status, @timestamp) WHERE type == "alert" AND episode.status IS NOT NULL,
      last_episode_id = LAST(episode.id, @timestamp) WHERE type == "alert" AND episode.status IS NOT NULL,
      last_episode_status = LAST(episode.status, @timestamp) WHERE type == "alert" AND episode.status IS NOT NULL,
      last_episode_status_count = LAST(episode.status_count, @timestamp) WHERE type == "alert" AND episode.status IS NOT NULL,
      last_episode_timestamp = MAX(@timestamp) WHERE type == "alert" AND episode.status IS NOT NULL,
      last_lifecycle_action_type = LAST(action_type, @timestamp) WHERE action_type IN (${ALERT_EPISODE_ACTION_TYPE.ACTIVATE}, ${ALERT_EPISODE_ACTION_TYPE.DEACTIVATE})
    BY group_hash`;

  query = query.keep(
    'last_status',
    'last_episode_id',
    'last_episode_status',
    'last_episode_status_count',
    'last_episode_timestamp',
    'last_lifecycle_action_type',
    'group_hash'
  );

  return query;
};
