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

  it('returns matched pairs for episodes with global catch-all policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
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
  it('matches episode to all global catch-all policies', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
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

  it('does not match when KQL matcher evaluates to false', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
    const rule = createRule({ id: 'r1' });
    const policy = createNotificationPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('matches when KQL matcher evaluates to true', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1' });
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
    const rule = createRule({ id: 'r1' });
    const policy = createNotificationPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('matches with complex KQL using OR operator', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'recovering' });
    const rule = createRule({ id: 'r1' });
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
    const rule = createRule({ id: 'r1' });
    const policy = createNotificationPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('skips disabled policies', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createNotificationPolicy({ id: 'p1', enabled: false });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('skips snoozed policies when snoozedUntil is in the future', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const policy = createNotificationPolicy({ id: 'p1', snoozedUntil: futureDate });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('matches policies when snoozedUntil is in the past', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const pastDate = new Date(Date.now() - 3_600_000).toISOString();
    const policy = createNotificationPolicy({ id: 'p1', snoozedUntil: pastDate });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('matches enabled policies without snooze', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createNotificationPolicy({ id: 'p1', enabled: true });

    const matched = evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  describe('rule label scoping', () => {
    it('matches when policy has no ruleLabels (global)', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', labels: ['production'] });
      const policy = createNotificationPolicy({ id: 'p1', ruleLabels: [] });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]])
      );

      expect(matched).toHaveLength(1);
    });

    it('matches when policy ruleLabels overlap with rule labels', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', labels: ['production', 'critical'] });
      const policy = createNotificationPolicy({ id: 'p1', ruleLabels: ['critical'] });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]])
      );

      expect(matched).toHaveLength(1);
    });

    it('does not match when policy ruleLabels do not overlap with rule labels', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', labels: ['staging'] });
      const policy = createNotificationPolicy({ id: 'p1', ruleLabels: ['production'] });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]])
      );

      expect(matched).toHaveLength(0);
    });

    it('does not match when rule has no labels and policy has ruleLabels', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', labels: [] });
      const policy = createNotificationPolicy({ id: 'p1', ruleLabels: ['production'] });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]])
      );

      expect(matched).toHaveLength(0);
    });

    it('applies both rule label scoping and KQL matcher', () => {
      const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
      const rule = createRule({ id: 'r1', labels: ['production'] });
      const matchingPolicy = createNotificationPolicy({
        id: 'p1',
        ruleLabels: ['production'],
        matcher: 'episode_status: active',
      });
      const nonMatchingLabelPolicy = createNotificationPolicy({
        id: 'p2',
        ruleLabels: ['staging'],
        matcher: 'episode_status: active',
      });
      const nonMatchingKqlPolicy = createNotificationPolicy({
        id: 'p3',
        ruleLabels: ['production'],
        matcher: 'episode_status: inactive',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([
          ['p1', matchingPolicy],
          ['p2', nonMatchingLabelPolicy],
          ['p3', nonMatchingKqlPolicy],
        ])
      );

      expect(matched).toHaveLength(1);
      expect(matched[0].policy.id).toBe('p1');
    });
  });
});
