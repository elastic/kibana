/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createActionPolicy,
  createAlertEpisode,
  createDispatcherPipelineState,
  createRule,
} from '../fixtures/test_utils';
import type {
  AlertEpisode,
  ActionPolicy,
  ActionPolicyId,
  MatchedPair,
  Rule,
  RuleId,
} from '../types';
import { EvaluateMatchersStep } from './evaluate_matchers_step';

describe('EvaluateMatchersStep', () => {
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let step: EvaluateMatchersStep;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    step = new EvaluateMatchersStep(loggerService);
  });

  const runStep = async (
    dispatchable: AlertEpisode[],
    rules: Map<RuleId, Rule>,
    policies: Map<ActionPolicyId, ActionPolicy>
  ): Promise<MatchedPair[]> => {
    const state = createDispatcherPipelineState({ dispatchable, rules, policies });
    const result = await step.execute(state);
    if (result.type !== 'continue') {
      throw new Error(`expected step output 'continue', got '${result.type}'`);
    }
    return result.data?.matched ?? [];
  };

  it('returns matched pairs for episodes with global catch-all policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1' });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
    expect(matched[0].episode).toBe(episode);
    expect(matched[0].policy).toBe(policy);
  });

  it('returns empty when no episodes', async () => {
    const matched = await runStep([], new Map(), new Map());
    expect(matched).toHaveLength(0);
  });

  it('matches episode to all global catch-all policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const p1 = createActionPolicy({ id: 'p1' });
    const p2 = createActionPolicy({ id: 'p2' });

    const matched = await runStep(
      [episode],
      new Map([['r1', rule]]),
      new Map([
        ['p1', p1],
        ['p2', p2],
      ])
    );

    expect(matched).toHaveLength(2);
  });

  it('skips episodes whose rule is not found', async () => {
    const episode = createAlertEpisode({ rule_id: 'unknown-rule' });

    const matched = await runStep([episode], new Map(), new Map());

    expect(matched).toHaveLength(0);
  });

  it('does not match when KQL matcher evaluates to false', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('matches when KQL matcher evaluates to true', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
    expect(matched[0].episode).toBe(episode);
    expect(matched[0].policy).toBe(policy);
  });

  it('matches with complex KQL using AND operator', async () => {
    const episode = createAlertEpisode({
      rule_id: 'r1',
      episode_status: 'active',
      group_hash: 'critical-group',
    });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('matches with complex KQL using OR operator', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'recovering' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({
      id: 'p1',
      matcher: 'episode_status: active or episode_status: recovering',
    });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('does not match when AND condition is partially met', async () => {
    const episode = createAlertEpisode({
      rule_id: 'r1',
      episode_status: 'active',
      group_hash: 'normal-group',
    });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('skips disabled policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', enabled: false });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('skips snoozed policies when snoozedUntil is in the future', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const policy = createActionPolicy({ id: 'p1', snoozedUntil: futureDate });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
  });

  it('matches policies when snoozedUntil is in the past', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const pastDate = new Date(Date.now() - 3_600_000).toISOString();
    const policy = createActionPolicy({ id: 'p1', snoozedUntil: pastDate });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('matches enabled policies without snooze', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', enabled: true });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(1);
  });

  it('skips policies with invalid KQL matchers and logs a warning', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'invalid kql (((' });

    const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    expect(matched).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('continues evaluating sibling policies when one matcher throws', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1' });
    const badPolicy = createActionPolicy({ id: 'p-bad', matcher: 'invalid kql (((' });
    const goodPolicy = createActionPolicy({
      id: 'p-good',
      matcher: 'episode_status: active',
    });

    const matched = await runStep(
      [episode],
      new Map([['r1', rule]]),
      new Map([
        ['p-bad', badPolicy],
        ['p-good', goodPolicy],
      ])
    );

    expect(matched).toHaveLength(1);
    expect(matched[0].policy).toBe(goodPolicy);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('continues evaluating subsequent episodes when a matcher throws on a previous episode', async () => {
    const e1 = createAlertEpisode({ episode_id: 'e1', rule_id: 'r1' });
    const e2 = createAlertEpisode({ episode_id: 'e2', rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const badPolicy = createActionPolicy({ id: 'p-bad', matcher: 'invalid kql (((' });
    const catchAllPolicy = createActionPolicy({ id: 'p-catchall' });

    const matched = await runStep(
      [e1, e2],
      new Map([['r1', rule]]),
      new Map([
        ['p-bad', badPolicy],
        ['p-catchall', catchAllPolicy],
      ])
    );

    expect(matched).toHaveLength(2);
    expect(matched.map(({ episode }) => episode)).toEqual([e1, e2]);
    expect(matched.every(({ policy }) => policy === catchAllPolicy)).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('warn message includes policy id, rule id, episode id, and matcher', async () => {
    const episode = createAlertEpisode({ episode_id: 'ep-42', rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p-broken', matcher: 'invalid kql (((' });

    await runStep([episode], new Map([['r1', rule]]), new Map([['p-broken', policy]]));

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const messageArg = mockLogger.warn.mock.calls[0][0];
    const rendered = typeof messageArg === 'function' ? messageArg() : String(messageArg);
    expect(rendered).toContain('p-broken');
    expect(rendered).toContain('r1');
    expect(rendered).toContain('ep-42');
    expect(rendered).toContain('invalid kql (((');
  });

  it('truncates matchers longer than 500 chars in the warn message', async () => {
    const longMatcher = '('.repeat(600);
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: longMatcher });

    await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

    const messageArg = mockLogger.warn.mock.calls[0][0];
    const rendered = typeof messageArg === 'function' ? messageArg() : String(messageArg);
    expect(rendered).toContain(`${longMatcher.slice(0, 500)}…`);
    expect(rendered).not.toContain(longMatcher);
  });

  describe('rule-aware KQL matching', () => {
    it('matches rule.name via KQL', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', name: 'Test rule' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.name: "Test rule"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });

    it('matches rule.tags via array membership', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', tags: ['production', 'critical'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.tags: "production"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });

    it('matches combined episode and rule conditions', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
      const rule = createRule({ id: 'r1', tags: ['production'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'episode_status: active and rule.tags: "production"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });

    it('does not match rule.tags when rule has no matching tags', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', tags: [] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.tags: "production"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(0);
    });

    it('does not match when combined condition is partially met', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
      const rule = createRule({ id: 'r1', tags: ['production'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'episode_status: active and rule.tags: "production"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(0);
    });
  });

  describe('data field KQL matching', () => {
    it('matches on data.severity', async () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { severity: 'critical' },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });

    it('does not match when data field value differs', async () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { env: 'staging' },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.env: "production"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(0);
    });

    it('does not match when episode has no data', async () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(0);
    });

    it('matches combined data and rule conditions', async () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { severity: 'critical' },
      });
      const rule = createRule({ id: 'r1', name: 'CPU Alert' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical" and rule.name: "CPU Alert"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });

    it('matches on nested data fields (unflattened dot-separated keys)', async () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { host: { name: 'my-host.com' } },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.host.name: "my-host.com"',
      });

      const matched = await runStep([episode], new Map([['r1', rule]]), new Map([['p1', policy]]));

      expect(matched).toHaveLength(1);
    });
  });
});
