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
import { EvaluateMatchersStep, evaluateMatchers } from './evaluate_matchers_step';

let loggerService: LoggerService;
let mockLogger: jest.Mocked<Logger>;

beforeEach(() => {
  ({ loggerService, mockLogger } = createLoggerService());
});

describe('EvaluateMatchersStep', () => {
  let step: EvaluateMatchersStep;

  beforeEach(() => {
    step = new EvaluateMatchersStep(loggerService);
  });

  it('returns matched pairs for episodes with global catch-all policies', async () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1' });

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
    const p1 = createActionPolicy({ id: 'p1' });
    const p2 = createActionPolicy({ id: 'p2' });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([
        ['p1', p1],
        ['p2', p2],
      ]),
      loggerService
    );

    expect(matched).toHaveLength(2);
  });

  it('skips episodes whose rule is not found', () => {
    const episode = createAlertEpisode({ rule_id: 'unknown-rule' });

    const matched = evaluateMatchers([episode], new Map(), new Map(), loggerService);

    expect(matched).toHaveLength(0);
  });

  it('does not match when KQL matcher evaluates to false', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(0);
  });

  it('matches when KQL matcher evaluates to true', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'episode_status: active' });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

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
    const policy = createActionPolicy({
      id: 'p1',
      matcher: 'episode_status: active and group_hash: critical-group',
    });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(1);
  });

  it('matches with complex KQL using OR operator', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'recovering' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({
      id: 'p1',
      matcher: 'episode_status: active or episode_status: recovering',
    });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(1);
  });

  it('does not match when AND condition is partially met', () => {
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

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(0);
  });

  it('skips disabled policies', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', enabled: false });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(0);
  });

  it('skips snoozed policies when snoozedUntil is in the future', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const policy = createActionPolicy({ id: 'p1', snoozedUntil: futureDate });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(0);
  });

  it('matches policies when snoozedUntil is in the past', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const pastDate = new Date(Date.now() - 3_600_000).toISOString();
    const policy = createActionPolicy({ id: 'p1', snoozedUntil: pastDate });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(1);
  });

  it('matches enabled policies without snooze', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', enabled: true });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(1);
  });

  it('skips policies with invalid KQL matchers and logs a warning', () => {
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: 'invalid kql (((' });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p1', policy]]),
      loggerService
    );

    expect(matched).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('continues evaluating sibling policies when one matcher throws', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
    const rule = createRule({ id: 'r1' });
    const badPolicy = createActionPolicy({ id: 'p-bad', matcher: 'invalid kql (((' });
    const goodPolicy = createActionPolicy({
      id: 'p-good',
      matcher: 'episode_status: active',
    });

    const matched = evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([
        ['p-bad', badPolicy],
        ['p-good', goodPolicy],
      ]),
      loggerService
    );

    expect(matched).toHaveLength(1);
    expect(matched[0].policy).toBe(goodPolicy);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('continues evaluating subsequent episodes when a matcher throws on a previous episode', () => {
    const e1 = createAlertEpisode({ episode_id: 'e1', rule_id: 'r1' });
    const e2 = createAlertEpisode({ episode_id: 'e2', rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const badPolicy = createActionPolicy({ id: 'p-bad', matcher: 'invalid kql (((' });
    const catchAllPolicy = createActionPolicy({ id: 'p-catchall' });

    const matched = evaluateMatchers(
      [e1, e2],
      new Map([['r1', rule]]),
      new Map([
        ['p-bad', badPolicy],
        ['p-catchall', catchAllPolicy],
      ]),
      loggerService
    );

    expect(matched).toHaveLength(2);
    expect(matched.map(({ episode }) => episode)).toEqual([e1, e2]);
    expect(matched.every(({ policy }) => policy === catchAllPolicy)).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('warn message includes policy id, rule id, episode id, and matcher', () => {
    const episode = createAlertEpisode({ episode_id: 'ep-42', rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p-broken', matcher: 'invalid kql (((' });

    evaluateMatchers(
      [episode],
      new Map([['r1', rule]]),
      new Map([['p-broken', policy]]),
      loggerService
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const messageArg = mockLogger.warn.mock.calls[0][0];
    const rendered = typeof messageArg === 'function' ? messageArg() : String(messageArg);
    expect(rendered).toContain('p-broken');
    expect(rendered).toContain('r1');
    expect(rendered).toContain('ep-42');
    expect(rendered).toContain('invalid kql (((');
  });

  it('truncates matchers longer than 500 chars in the warn message', () => {
    const longMatcher = '('.repeat(600);
    const episode = createAlertEpisode({ rule_id: 'r1' });
    const rule = createRule({ id: 'r1' });
    const policy = createActionPolicy({ id: 'p1', matcher: longMatcher });

    evaluateMatchers([episode], new Map([['r1', rule]]), new Map([['p1', policy]]), loggerService);

    const messageArg = mockLogger.warn.mock.calls[0][0];
    const rendered = typeof messageArg === 'function' ? messageArg() : String(messageArg);
    expect(rendered).toContain(`${longMatcher.slice(0, 500)}…`);
    expect(rendered).not.toContain(longMatcher);
  });

  describe('rule-aware KQL matching', () => {
    it('matches rule.name via KQL', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', name: 'Test rule' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.name: "Test rule"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });

    it('matches rule.tags via array membership', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', tags: ['production', 'critical'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.tags: "production"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });

    it('matches combined episode and rule conditions', () => {
      const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'active' });
      const rule = createRule({ id: 'r1', tags: ['production'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'episode_status: active and rule.tags: "production"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });

    it('does not match rule.tags when rule has no matching tags', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1', tags: [] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'rule.tags: "production"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(0);
    });

    it('does not match when combined condition is partially met', () => {
      const episode = createAlertEpisode({ rule_id: 'r1', episode_status: 'inactive' });
      const rule = createRule({ id: 'r1', tags: ['production'] });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'episode_status: active and rule.tags: "production"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(0);
    });
  });

  describe('data field KQL matching', () => {
    it('matches on data.severity', () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { severity: 'critical' },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });

    it('does not match when data field value differs', () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { env: 'staging' },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.env: "production"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(0);
    });

    it('does not match when episode has no data', () => {
      const episode = createAlertEpisode({ rule_id: 'r1' });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(0);
    });

    it('matches combined data and rule conditions', () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { severity: 'critical' },
      });
      const rule = createRule({ id: 'r1', name: 'CPU Alert' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.severity: "critical" and rule.name: "CPU Alert"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });

    it('matches on nested data fields (unflattened dot-separated keys)', () => {
      const episode = createAlertEpisode({
        rule_id: 'r1',
        data: { host: { name: 'my-host.com' } },
      });
      const rule = createRule({ id: 'r1' });
      const policy = createActionPolicy({
        id: 'p1',
        matcher: 'data.host.name: "my-host.com"',
      });

      const matched = evaluateMatchers(
        [episode],
        new Map([['r1', rule]]),
        new Map([['p1', policy]]),
        loggerService
      );

      expect(matched).toHaveLength(1);
    });
  });
});
