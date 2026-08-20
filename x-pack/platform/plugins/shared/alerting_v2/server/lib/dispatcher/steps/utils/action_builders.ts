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
  actionType: 'suppress' | 'fire' | 'notified' | 'unmatched';
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
  const spaceId = firstEpisode?.space_id ?? 'default';
  const action: AlertAction = {
    '@timestamp': now.toISOString(),
    actor: 'system',
    action_type: 'notified',
    rule_id: firstEpisode?.rule_id ?? null,
    group_hash: firstEpisode?.group_hash ?? 'unknown',
    last_series_event_timestamp: now.toISOString(),
    action_group_id: group.id,
    source: firstEpisode?.source,
    reason: `notified by policy ${group.policyId}`,
    space_id: spaceId,
  };
  if ((groupingMode ?? 'per_episode') === 'per_episode') {
    action.episode_status = firstEpisode?.episode_status;
  }
  return action;
}
