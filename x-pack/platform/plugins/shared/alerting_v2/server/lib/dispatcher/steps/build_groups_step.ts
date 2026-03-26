/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import objectHash from 'object-hash';
import type {
  MatchedPair,
  NotificationGroup,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
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
    let groupKey: Record<string, unknown> = {};
    if (policy.groupBy.length === 0) {
      groupKey = {
        groupHash: episode.group_hash,
        episodeId: episode.episode_id,
      };
    } else {
      throw new Error('Grouping by fields is not supported yet');
    }

    const notificationGroupId = objectHash({
      ruleId: episode.rule_id,
      policyId: policy.id,
      groupKey,
    });

    if (!groupMap.has(notificationGroupId)) {
      groupMap.set(notificationGroupId, {
        id: notificationGroupId,
        spaceId: policy.spaceId,
        ruleId: episode.rule_id,
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
