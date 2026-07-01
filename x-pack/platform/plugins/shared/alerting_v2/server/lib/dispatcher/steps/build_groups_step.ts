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
  ActionGroup,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  Rule,
  RuleId,
} from '../types';

@injectable()
export class BuildGroupsStep implements DispatcherStep {
  public readonly name = 'build_groups';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { matched = [], rules } = state;

    const groups = buildActionGroups(matched, rules);

    return { type: 'continue', data: { groups } };
  }
}

export function buildActionGroups(
  matched: readonly MatchedPair[],
  rules?: Map<RuleId, Rule>
): ActionGroup[] {
  const groupMap = new Map<string, ActionGroup>();

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

    const actionGroupId = objectHash({
      policyId: policy.id,
      groupKey,
    });

    if (!groupMap.has(actionGroupId)) {
      groupMap.set(actionGroupId, {
        id: actionGroupId,
        spaceId: policy.spaceId,
        policyId: policy.id,
        destinations: policy.destinations,
        groupKey,
        episodes: [],
        rules: {},
      });
    }

    const group = groupMap.get(actionGroupId)!;
    group.episodes.push(episode);
    const rule = rules?.get(episode.rule_id);
    if (rule) {
      group.rules[episode.rule_id] = { name: rule.name };
    }
  }

  return [...groupMap.values()];
}
