/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAction } from '../../../../resources/datastreams/alert_actions';
import type { ActionGroup, ActionPolicy, AlertEpisode } from '../../types';

export function toAction({
  episode,
  actionType,
  now,
  reason,
  spaceId,
}: {
  episode: AlertEpisode;
  actionType: 'suppress' | 'fire' | 'unmatched';
  now: Date;
  reason?: string;
  spaceId: string;
}): AlertAction {
  return {
    '@timestamp': now.toISOString(),
    group_hash: episode.group_hash,
    last_series_event_timestamp: episode.last_event_timestamp,
    actor: 'system',
    action_type: actionType,
    rule_id: episode.rule_id,
    source: episode.source,
    reason,
    space_id: spaceId,
  };
}

export function toNotifiedAction(
  group: ActionGroup,
  groupingMode: ActionPolicy['groupingMode'],
  now: Date
): AlertAction {
  const firstEpisode = group.episodes[0];
  if (!firstEpisode) {
    // A notified record without episodes has no valid group_hash, which is used
    // as a dedup key. An empty sentinel would collide across unrelated groups.
    throw new Error(
      `toNotifiedAction called with empty episodes for group ${group.id} (policy ${group.policyId})`
    );
  }
  const action: AlertAction = {
    '@timestamp': now.toISOString(),
    actor: 'system',
    action_type: 'notified',
    rule_id: firstEpisode.rule_id,
    group_hash: firstEpisode.group_hash,
    // last_series_event_timestamp uses dispatch time (now), not the episode's last
    // event timestamp — notified records represent when the notification was sent,
    // which is what throttle-window queries use via MAX(@timestamp).
    last_series_event_timestamp: now.toISOString(),
    action_group_id: group.id,
    source: firstEpisode.source,
    reason: `notified by policy ${group.policyId}`,
    space_id: firstEpisode.space_id,
  };
  if ((groupingMode ?? 'per_episode') === 'per_episode') {
    action.episode_status = firstEpisode.episode_status;
  }
  return action;
}
