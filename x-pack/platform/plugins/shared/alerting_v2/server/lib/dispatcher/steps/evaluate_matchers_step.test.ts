/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluateMatchersStep, evaluateMatchers } from './evaluate_matchers_step';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
  createNotificationPolicy,
  createRule,
} from '../fixtures/test_utils';

describe('EvaluateMatchersStep', () => {
  const step = new EvaluateMatchersStep();

  it('returns matched pairs for episodes with catch-all policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({ id: 'p1' });

    const state = createDispatcherPipelineState({
      dispatchable: [episode],
      rules: new Map([['r1', rule]]),
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.matched).toHaveLength(1);
    expect(result.data?.matched?.[0].episode).toBe(episode);
    expect(result.data?.matched?.[0].policy).toBe(policy);
  });

  it('returns empty when no episodes', async () => {
    const state = createDispatcherPipelineState({
      dispatchable: [],
      rules: new Map(),
      policies: new Map(),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.matched).toHaveLength(0);
  });
});

describe('evaluateMatchers', () => {
  it('matches episode to all catch-all policies on its rule', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1', 'p2'] });
    const p1 = createNotificationPolicy({ id: 'p1' });
    const p2 = createNotificationPolicy({ id: 'p2' });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([
        ['p1', p1],
        ['p2', p2],
      ])
    );

    expect(matched).toHaveLength(2);
  });

  it('skips episodes whose rule is not found', () => {
    const episode = createAlertEpisode({ rule_id: 'unknown-rule' });

    const matched = evaluateMatchers([episode], new Map(), new Map());

    expect(matched).toHaveLength(0);
  });

  it('skips policies that are not found', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['missing-policy'] });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map());

    expect(matched).toHaveLength(0);
  });

  it('does not match when KQL matcher evaluates to false', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('matches when KQL matcher evaluates to true', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
    expect(matched[0].episode).toBe(episode);
    expect(matched[0].policy).toBe(policy);
  });

  it('matches with complex KQL using AND operator', () => {
    const episode = createAlertEpisode({
      rule_id: 'r1',
      episode_status: 'active',
      group_hash: 'critical-group',
    });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('matches with complex KQL using OR operator', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'recovering' });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({
      id: 'p1',
      matcher: 'episode_status: active or episode_status: recovering',
    });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('does not match when AND condition is partially met', () => {
    const episode = createAlertEpisode({
      rule_id: 'r1',
      episode_status: 'active',
      group_hash: 'normal-group',
    });
    const rule = createRule({ id: 'r1', notificationPolicyIds: ['p1'] });
    const policy = createNotificationPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });
});
