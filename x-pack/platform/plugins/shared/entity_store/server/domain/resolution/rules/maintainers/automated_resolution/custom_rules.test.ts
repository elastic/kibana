/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RESOLUTION_RULE_IDS } from '../../../../../../common/domain/resolution_rules/constants';
import type { CustomResolutionRule } from '../../custom';
import { fingerprintMatchSpec, toExpressionMatchSpec, toRuleDefinition } from '../../custom';
import { runEsqlMatcherRule } from '../../matcher';
import type { ResolutionRulesClient } from '../../rule_client';
import type { ResolutionClient } from '../../../resolution_client';
import type { MaintainerTelemetryClient } from '../../../../../tasks/entity_maintainers/maintainer_telemetry_client';
import { runCustomResolutionRules } from './custom_rules';
import type { PerRuleState } from './types';

jest.mock('../../matcher', () => ({
  ...jest.requireActual('../../matcher'),
  runEsqlMatcherRule: jest.fn(),
}));

const WATERMARKED: PerRuleState = { lastProcessedTimestamp: '2026-10-01T00:00:00Z', lastRun: null };
const EMPTY: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

const rule = (id: string, overrides: Partial<CustomResolutionRule> = {}): CustomResolutionRule => ({
  id,
  name: id,
  namespaces: ['local', 'active_directory'],
  match_value: 'TO_LOWER(user.name)',
  decline_same_namespace_duplicates: true,
  enabled: true,
  ...overrides,
});

const hashOf = (customRule: CustomResolutionRule) =>
  fingerprintMatchSpec(toExpressionMatchSpec(toRuleDefinition(customRule)));

const run = async (
  customRules: CustomResolutionRule[] | Error,
  previousRules: Record<string, PerRuleState> = {},
  signal: AbortSignal = new AbortController().signal,
  deadline: number = Date.now() + 60_000
) => {
  const esClient = {
    indices: { refresh: jest.fn().mockResolvedValue({}) },
  } as unknown as ElasticsearchClient;
  const logger = loggerMock.create();
  const rules: Record<string, PerRuleState> = { ...previousRules };
  await runCustomResolutionRules({
    previousRules,
    rules,
    resolutionRulesClient: {
      getCustomRules:
        customRules instanceof Error
          ? jest.fn().mockRejectedValue(customRules)
          : jest.fn().mockResolvedValue(customRules),
    } as unknown as ResolutionRulesClient,
    namespace: 'default',
    index: '.entities.v2.latest.default',
    esClient,
    logger,
    resolutionClient: {} as ResolutionClient,
    signal,
    telemetry: { report: jest.fn() } as unknown as MaintainerTelemetryClient,
    mutatedIds: new Set(),
    deadline,
  });
  return { rules, logger };
};

const calledRuleIds = () =>
  (runEsqlMatcherRule as jest.Mock).mock.calls.map(([deps]) => deps.ruleId);

describe('runCustomResolutionRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (runEsqlMatcherRule as jest.Mock).mockResolvedValue(WATERMARKED);
  });

  it('runs each enabled rule with its expressions under a custom: state key', async () => {
    const { rules } = await run([rule('a')]);

    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(1);
    const [deps] = (runEsqlMatcherRule as jest.Mock).mock.calls[0];
    expect(deps.ruleId).toBe('custom:a');
    expect(deps.spec).toEqual({
      namespaces: ['local', 'active_directory'],
      matchValueExpression: 'TO_LOWER(user.name)',
      declineSameNamespaceDuplicates: true,
    });
    expect(rules['custom:a']).toEqual({
      ...WATERMARKED,
      definitionHash: hashOf(rule('a')),
      lastAttemptAt: expect.any(String),
    });
  });

  it('resumes from the watermark when the definition is unchanged', async () => {
    const previous = { 'custom:a': { ...WATERMARKED, definitionHash: hashOf(rule('a')) } };
    await run([rule('a')], previous);

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].state).toEqual(WATERMARKED);
  });

  it('rescans from scratch when the definition changed', async () => {
    const previous = { 'custom:a': { ...WATERMARKED, definitionHash: hashOf(rule('a')) } };
    await run([rule('a', { match_value: 'TO_UPPER(user.name)' })], previous);

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].state).toEqual(EMPTY);
  });

  it('rescans when the stored state has no fingerprint', async () => {
    await run([rule('a')], { 'custom:a': WATERMARKED });

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].state).toEqual(EMPTY);
  });

  it('runs every first scan in the same run while there is time', async () => {
    await run([rule('a'), rule('b'), rule('c')]);

    expect(calledRuleIds()).toEqual(['custom:a', 'custom:b', 'custom:c']);
  });

  it('keeps running later rules when a scan fails', async () => {
    (runEsqlMatcherRule as jest.Mock)
      .mockRejectedValueOnce(new Error('verification_exception'))
      .mockResolvedValueOnce(WATERMARKED);
    const { rules, logger } = await run([rule('a'), rule('b')]);

    expect(calledRuleIds()).toEqual(['custom:a', 'custom:b']);
    expect(rules['custom:a']).toMatchObject({ lastProcessedTimestamp: null });
    expect(rules['custom:b']).toMatchObject(WATERMARKED);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'a' failed"));
  });

  it('keeps the watermark of a failed rule and records the attempt', async () => {
    (runEsqlMatcherRule as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const previous = { 'custom:a': { ...WATERMARKED, definitionHash: hashOf(rule('a')) } };
    const { rules } = await run([rule('a')], previous);

    expect(rules['custom:a']).toEqual({
      ...WATERMARKED,
      definitionHash: hashOf(rule('a')),
      lastAttemptAt: expect.any(String),
    });
  });

  describe('soft deadline', () => {
    const watermarked = (id: string, lastAttemptAt: string) => ({
      [`custom:${id}`]: { ...WATERMARKED, definitionHash: hashOf(rule(id)), lastAttemptAt },
    });

    // Behaves like the matcher: works until its signal fires, then returns the
    // state it was given.
    const runUntilAborted = async ({
      signal,
      state,
    }: {
      signal: AbortSignal;
      state: PerRuleState;
    }) => {
      while (!signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      return state;
    };

    it('starts no custom rule once the deadline has passed', async () => {
      const { rules, logger } = await run([rule('a')], {}, undefined, Date.now() - 1);

      expect(runEsqlMatcherRule).not.toHaveBeenCalled();
      expect(rules).toEqual({});
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('soft deadline has passed'));
    });

    it('stops a running rule, keeps its watermark, and leaves the rest for next run', async () => {
      (runEsqlMatcherRule as jest.Mock).mockImplementationOnce(runUntilAborted);
      const previous = {
        ...watermarked('a', '2026-10-01T00:00:00Z'),
        ...watermarked('b', '2026-10-02T00:00:00Z'),
      };

      const { rules, logger } = await run(
        [rule('a'), rule('b')],
        previous,
        undefined,
        Date.now() + 30
      );

      expect(calledRuleIds()).toEqual(['custom:a']);
      expect(rules['custom:a']).toEqual({
        ...WATERMARKED,
        definitionHash: hashOf(rule('a')),
        lastAttemptAt: expect.any(String),
      });
      expect(rules['custom:a']).not.toEqual(previous['custom:a']);
      expect(rules['custom:b']).toBe(previous['custom:b']);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('custom:a: stopped at the soft deadline')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('1 rule(s) continue next run')
      );
    });

    it('does not report a query cut off by the deadline as a failure', async () => {
      (runEsqlMatcherRule as jest.Mock).mockImplementationOnce(async (deps) => {
        await runUntilAborted(deps);
        throw new Error('Request aborted');
      });
      const { logger } = await run([rule('a')], {}, undefined, Date.now() + 30);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('starts with the rule that was attempted least recently', async () => {
      const previous = {
        ...watermarked('a', '2026-10-13T10:05:00Z'),
        ...watermarked('b', '2026-10-13T10:00:00Z'),
        ...watermarked('c', '2026-10-13T09:55:00Z'),
      };
      await run([rule('a'), rule('b'), rule('c')], previous);

      expect(calledRuleIds()).toEqual(['custom:c', 'custom:b', 'custom:a']);
    });

    it('passes the task abort through: an aborted task is not a deadline', async () => {
      const controller = new AbortController();
      (runEsqlMatcherRule as jest.Mock).mockImplementationOnce(async (deps) => {
        controller.abort();
        return runUntilAborted(deps);
      });
      const { logger } = await run([rule('a'), rule('b')], {}, controller.signal);

      expect(calledRuleIds()).toEqual(['custom:a']);
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('soft deadline'));
    });
  });

  it('skips a rule that no longer validates without stopping the others', async () => {
    const { logger } = await run([rule('bad', { match_value: 'a | LIMIT 1' }), rule('good')]);

    expect(calledRuleIds()).toEqual(['custom:good']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'bad' failed"));
  });

  it('keeps the state of a disabled rule without running it', async () => {
    const state = { ...WATERMARKED, definitionHash: 'x' };
    const { rules } = await run([rule('a', { enabled: false })], { 'custom:a': state });

    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(rules['custom:a']).toBe(state);
  });

  it('drops the state of deleted custom rules and nothing else', async () => {
    const ootbState = WATERMARKED;
    const { rules } = await run([rule('kept', { enabled: false })], {
      'custom:deleted': { ...WATERMARKED, definitionHash: 'x' },
      'custom:kept': { ...WATERMARKED, definitionHash: 'y' },
      [RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH]: ootbState,
      future_ootb_rule: ootbState,
    });

    expect(Object.keys(rules).sort()).toEqual(
      [RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH, 'custom:kept', 'future_ootb_rule'].sort()
    );
  });

  it('leaves all state alone when the rules cannot be loaded', async () => {
    const previous = { 'custom:a': { ...WATERMARKED, definitionHash: 'x' } };
    const { rules, logger } = await run(new Error('forbidden'), previous);

    expect(rules).toEqual(previous);
    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to load'));
  });

  it('stops before the next rule once aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await run([rule('a')], {}, controller.signal);

    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
  });
});
