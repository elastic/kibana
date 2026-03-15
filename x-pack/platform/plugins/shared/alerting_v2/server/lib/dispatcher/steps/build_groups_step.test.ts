/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuildGroupsStep, buildNotificationGroups } from './build_groups_step';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
  createMatchedPair,
  createNotificationPolicy,
} from '../fixtures/test_utils';

describe('BuildGroupsStep', () => {
  const step = new BuildGroupsStep();

  it('returns notification groups from matched pairs', async () => {
    const state = createDispatcherPipelineState({
      matched: [
        createMatchedPair({
          episode: createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
          policy: createNotificationPolicy({
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
    expect(result.data?.groups?.[0].ruleId).toBe('r1');
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

describe('buildNotificationGroups', () => {
  it('creates separate groups for different episodes with no groupBy', () => {
    const policy = createNotificationPolicy({
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

    const groups = buildNotificationGroups(matched);

    expect(groups).toHaveLength(2);
  });

  it('groups episodes from same rule+policy+groupKey into same group', () => {
    const policy = createNotificationPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const matched = [
      createMatchedPair({ episode, policy }),
      createMatchedPair({ episode, policy }),
    ];

    const groups = buildNotificationGroups(matched);

    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(2);
  });

  it('assigns deterministic group IDs', () => {
    const policy = createNotificationPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'w1' }],
    });
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });

    const groups1 = buildNotificationGroups([createMatchedPair({ episode, policy })]);
    const groups2 = buildNotificationGroups([createMatchedPair({ episode, policy })]);

    expect(groups1[0].id).toBe(groups2[0].id);
  });

  it('throws when groupBy fields are provided', () => {
    const policy = createNotificationPolicy({ id: 'p1', groupBy: ['field1'] });
    const episode = createAlertEpisode();

    expect(() => buildNotificationGroups([createMatchedPair({ episode, policy })])).toThrow(
      'Grouping by fields is not supported yet'
    );
  });
});
