/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import { get } from 'lodash';
import objectHash from 'object-hash';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  NotificationGroup,
} from '../types';

@injectable()
export class BuildGroupsStep implements DispatcherStep {
  public readonly name = 'build_groups';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { matched = [] } = state;

    const groups = buildNotificationGroups(matched);

    return { type: 'continue', data: { groups } };
  }
}

export function buildNotificationGroups(matched: readonly MatchedPair[]): NotificationGroup[] {
  const groupMap = new Map<string, NotificationGroup>();

  for (const { episode, policy } of matched) {
    let groupKey: Record<string, unknown>;
    switch (policy.groupingMode ?? 'per_episode') {
      case 'per_episode':
        groupKey = {
          groupHash: episode.group_hash,
          episodeId: episode.episode_id,
        };
        break;
      case 'all':
        groupKey = {};
        break;
      case 'per_field':
        groupKey = Object.fromEntries(
          policy.groupBy.map((field) => [field, get(episode, field, null)])
        );
        break;
    }

    const notificationGroupId = objectHash({
      policyId: policy.id,
      groupKey,
    });

    if (!groupMap.has(notificationGroupId)) {
      groupMap.set(notificationGroupId, {
        id: notificationGroupId,
        spaceId: policy.spaceId,
        policyId: policy.id,
        destinations: policy.destinations,
        groupKey,
        episodes: [],
      });
    }

    groupMap.get(notificationGroupId)!.episodes.push(episode);
  }

  return [...groupMap.values()];
}
