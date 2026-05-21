/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuildGroupsStep, buildActionGroups } from './build_groups_step';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
  createMatchedPair,
  createActionPolicy,
} from '../fixtures/test_utils';

describe('BuildGroupsStep', () => {
  const step = new BuildGroupsStep();

  it('returns action groups from matched pairs', async () => {
    const state = createDispatcherPipelineState({
      matched: [
        createMatchedPair({
          episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
          policy: createActionPolicy({
            id: 'p1',
            destinations: [{ type: 'workflow', id: 'w1' }],
          }),
        }),
      ],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.groups).toHaveLength(1);
    expect(result.data?.groups?.[0].policyId).toBe('p1');
    expect(result.data?.groups?.[0].episodes).toHaveLength(1);
  });

  it('returns empty groups when no matched pairs', async () => {
    const state = createDispatcherPipelineState({ matched: [] });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.groups).toHaveLength(0);
  });
});

describe('buildActionGroups', () => {
  it('creates separate groups for different episodes with no groupBy', () => {
    const policy = createActionPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e2' }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(2);
  });

  it('groups episodes from same rule+policy+groupKey into same group', () => {
    const policy = createActionPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const matched = [
      createMatchedPair({ episode, policy }),
      createMatchedPair({ episode, policy }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(2);
  });

  it('assigns deterministic group IDs', () => {
    const policy = createActionPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });

    const groups1 = buildActionGroups([createMatchedPair({ episode, policy })]);
    const groups2 = buildActionGroups([createMatchedPair({ episode, policy })]);

    expect(groups1[0].id).toBe(groups2[0].id);
  });

  it('groups episodes by a single data field', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupBy: ['data.host.name'],
      groupingMode: 'per_field' as const,
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e1',
          data: { host: { name: 'server-1' } },
        }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e2',
          data: { host: { name: 'server-1' } },
        }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(2);
    expect(groups[0].groupKey).toEqual({ 'data.host.name': 'server-1' });
  });

  it('creates separate groups for different field values', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupBy: ['data.host.name'],
      groupingMode: 'per_field' as const,
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e1',
          data: { host: { name: 'server-1' } },
        }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e2',
          data: { host: { name: 'server-2' } },
        }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(2);
    expect(groups[0].groupKey).toEqual({ 'data.host.name': 'server-1' });
    expect(groups[1].groupKey).toEqual({ 'data.host.name': 'server-2' });
  });

  it('groups episodes by multiple data fields', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupBy: ['data.host.name', 'data.env'],
      groupingMode: 'per_field' as const,
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e1',
          data: { host: { name: 'server-1' }, env: 'prod' },
        }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e2',
          data: { host: { name: 'server-1' }, env: 'prod' },
        }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e3',
          data: { host: { name: 'server-1' }, env: 'staging' },
        }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(2);
    const prodGroup = groups.find((g) => g.groupKey['data.env'] === 'prod')!;
    const stagingGroup = groups.find((g) => g.groupKey['data.env'] === 'staging')!;
    expect(prodGroup.episodes).toHaveLength(2);
    expect(stagingGroup.episodes).toHaveLength(1);
  });

  it('defaults missing data fields to null', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupBy: ['data.host.name', 'data.env'],
      groupingMode: 'per_field' as const,
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e1',
          data: { host: { name: 'server-1' } },
        }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({
          rule_id: 'r1',
          episode_id: 'e2',
          data: {},
        }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    const groupWithHost = groups.find((g) => g.groupKey['data.host.name'] === 'server-1')!;
    expect(groupWithHost.groupKey).toEqual({ 'data.host.name': 'server-1', 'data.env': null });

    const groupWithoutHost = groups.find((g) => g.groupKey['data.host.name'] === null)!;
    expect(groupWithoutHost.groupKey).toEqual({ 'data.host.name': null, 'data.env': null });
  });

  it('creates one group per rule for all mode', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupingMode: 'all',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', episode_id: 'e1' }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', episode_id: 'e2' }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(2);
    expect(groups[0].groupKey).toEqual({});
  });

  it('merges episodes from different rules into one group in all mode', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupingMode: 'all',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', episode_id: 'e1' }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r2', episode_id: 'e2' }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(2);
    expect(groups[0].episodes[0].rule_id).toBe('r1');
    expect(groups[0].episodes[1].rule_id).toBe('r2');
  });

  it('creates one group per episode for explicit per_episode mode', () => {
    const policy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const matched = [
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
        policy,
      }),
      createMatchedPair({
        episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e2' }),
        policy,
      }),
    ];

    const groups = buildActionGroups(matched);

    expect(groups).toHaveLength(2);
  });
});
