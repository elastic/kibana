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
import { fingerprintDefinition } from '../../custom';
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

const INDEX = '.entities.v2.latest.default';
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

const fingerprintOf = (customRule: CustomResolutionRule) => fingerprintDefinition(customRule);

const watermarked = (
  id: string,
  lastStartedFirstAt: string | null = '2026-10-01T00:00:00Z',
  deferredByDeadline = false
) => ({
  [`custom:${id}`]: {
    ...WATERMARKED,
    definitionFingerprint: fingerprintOf(rule(id)),
    lastAttemptAt: '2026-10-01T00:00:00Z',
    lastStartedFirstAt,
    deferredByDeadline,
    lastError: null,
  },
});

interface RunOptions {
  previous?: Record<string, PerRuleState>;
  signal?: AbortSignal;
  deadline?: number;
  /** What a re-read just before running returns; defaults to the listed rule. */
  reread?: (id: string) => CustomResolutionRule | undefined;
  refresh?: jest.Mock;
}

const run = async (
  customRules: CustomResolutionRule[] | Error,
  {
    previous = {},
    signal = new AbortController().signal,
    deadline,
    reread,
    refresh = jest.fn().mockResolvedValue({}),
  }: RunOptions = {}
) => {
  const esClient = { indices: { refresh } } as unknown as ElasticsearchClient;
  const logger = loggerMock.create();
  const rules: Record<string, PerRuleState> = { ...previous };
  const listed = customRules instanceof Error ? [] : customRules;
  await runCustomResolutionRules({
    ruleStates: rules,
    resolutionRulesClient: {
      getCustomRules:
        customRules instanceof Error
          ? jest.fn().mockRejectedValue(customRules)
          : jest.fn().mockResolvedValue(customRules),
      getCustomRule: jest
        .fn()
        .mockImplementation(async (id: string) =>
          reread ? reread(id) : listed.find((candidate) => candidate.id === id)
        ),
    } as unknown as ResolutionRulesClient,
    index: INDEX,
    esClient,
    logger,
    resolutionClient: {} as ResolutionClient,
    signal,
    telemetry: { report: jest.fn() } as unknown as MaintainerTelemetryClient,
    mutatedIds: new Set(),
    deadline: deadline ?? Date.now() + 60_000,
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
    expect(deps).toMatchObject({
      ruleId: 'custom:a',
      telemetryRuleId: 'custom',
      index: INDEX,
      spec: {
        namespaces: ['local', 'active_directory'],
        matchValueExpression: 'TO_LOWER(user.name)',
        declineSameNamespaceDuplicates: true,
      },
    });
    expect(rules['custom:a']).toEqual({
      ...WATERMARKED,
      definitionFingerprint: fingerprintOf(rule('a')),
      lastAttemptAt: expect.any(String),
      lastStartedFirstAt: expect.any(String),
      deferredByDeadline: false,
      lastError: null,
    });
  });

  it('passes the same-namespace opt-out to the matcher', async () => {
    await run([rule('a', { decline_same_namespace_duplicates: false })]);

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].spec).toMatchObject({
      declineSameNamespaceDuplicates: false,
    });
  });

  it('resumes from the watermark when the definition is unchanged', async () => {
    await run([rule('a')], { previous: watermarked('a') });

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].state).toEqual(WATERMARKED);
  });

  it('rescans from scratch when the definition changed', async () => {
    await run([rule('a', { match_value: 'TO_UPPER(user.name)' })], { previous: watermarked('a') });

    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].state).toEqual(EMPTY);
  });

  it('rescans when the stored state has no fingerprint', async () => {
    await run([rule('a')], { previous: { 'custom:a': WATERMARKED } });

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
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('custom:a failed'));
  });

  it('keeps the watermark of a failed rule and records the attempt', async () => {
    (runEsqlMatcherRule as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const previous = watermarked('a');
    const { rules } = await run([rule('a')], { previous });

    expect(rules['custom:a']).toEqual({
      ...previous['custom:a'],
      lastAttemptAt: expect.any(String),
      lastStartedFirstAt: expect.any(String),
      lastError: 'boom',
    });
    expect(rules['custom:a']).not.toEqual(previous['custom:a']);
  });

  it('clears the last error once the rule runs cleanly', async () => {
    const previous = { 'custom:a': { ...watermarked('a')['custom:a'], lastError: 'boom' } };
    const { rules } = await run([rule('a')], { previous });

    expect(rules['custom:a']).toMatchObject({ lastError: null });
  });

  it('records why a rule that no longer validates was skipped', async () => {
    const { rules } = await run([rule('bad', { match_value: 'a | LIMIT 1' })]);

    expect(rules['custom:bad']).toMatchObject({
      lastError: expect.stringContaining("Invalid 'match_value'"),
    });
  });

  it('keeps running later rules when re-reading one fails, and records the failure', async () => {
    const { rules, logger } = await run([rule('a'), rule('b')], {
      reread: (id) => {
        if (id === 'a') {
          throw new Error('Unable to get entity-resolution-custom-rule');
        }
        return rule(id);
      },
    });

    expect(calledRuleIds()).toEqual(['custom:b']);
    expect(rules['custom:a']).toMatchObject({
      lastError: expect.stringContaining('Unable to get'),
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('custom:a failed'));
  });

  it('skips a rule that no longer validates without stopping the others', async () => {
    const { logger } = await run([rule('bad', { match_value: 'a | LIMIT 1' }), rule('good')]);

    expect(calledRuleIds()).toEqual(['custom:good']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('custom:bad failed'));
  });

  it('keeps the state of a disabled rule without running it', async () => {
    const previous = watermarked('a');
    const { rules } = await run([rule('a', { enabled: false })], { previous });

    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(rules['custom:a']).toBe(previous['custom:a']);
  });

  it.each([
    ['disabled', (id: string) => rule(id, { enabled: false })],
    ['deleted', () => undefined],
  ])('skips a rule %s after the list was loaded', async (_case, reread) => {
    await run([rule('a'), rule('b')], { reread: (id) => (id === 'a' ? reread(id) : rule(id)) });

    expect(calledRuleIds()).toEqual(['custom:b']);
  });

  it('runs the re-read definition when the rule was edited after the list was loaded', async () => {
    const edited = rule('a', { match_value: 'TO_UPPER(user.name)' });
    await run([rule('a')], { previous: watermarked('a'), reread: () => edited });

    const [deps] = (runEsqlMatcherRule as jest.Mock).mock.calls[0];
    expect(deps.spec.matchValueExpression).toBe('TO_UPPER(user.name)');
    expect(deps.state).toEqual(EMPTY);
  });

  it('drops the state of deleted custom rules and nothing else', async () => {
    const ootbState = WATERMARKED;
    const { rules } = await run([rule('kept', { enabled: false })], {
      previous: {
        ...watermarked('deleted'),
        ...watermarked('kept'),
        [RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH]: ootbState,
        future_ootb_rule: ootbState,
      },
    });

    expect(Object.keys(rules).sort()).toEqual(
      [RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH, 'custom:kept', 'future_ootb_rule'].sort()
    );
  });

  it('keeps the state of a rule missing from the list when reading it by id is forbidden', async () => {
    const previous = watermarked('a');
    const { rules, logger } = await run([], {
      previous,
      reread: () => {
        throw new Error('Unable to get entity-resolution-custom-rule');
      },
    });

    expect(rules).toEqual(previous);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('custom:a: keeping its state')
    );
  });

  it('keeps the state of a live rule when the rules cannot be loaded', async () => {
    const previous = watermarked('a');
    const { rules, logger } = await run(new Error('forbidden'), {
      previous,
      reread: (id) => rule(id),
    });

    expect(rules).toEqual(previous);
    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to load'));
  });

  it('drops the state of a deleted rule even when the rules cannot be loaded', async () => {
    const { rules } = await run(new Error('forbidden'), {
      previous: watermarked('deleted'),
      reread: () => undefined,
    });

    expect(rules).toEqual({});
  });

  it('stops before the next rule once the task is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { rules } = await run([rule('a')], { signal: controller.signal });

    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(rules).toEqual({});
  });

  describe('soft deadline', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-10-13T10:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Behaves like the matcher: works until its signal fires, then returns the
    // state it was given.
    const runUntilAborted = ({ signal, state }: { signal: AbortSignal; state: PerRuleState }) =>
      new Promise<PerRuleState>((resolve) => {
        if (signal.aborted) {
          resolve(state);
        }
        signal.addEventListener('abort', () => resolve(state));
      });

    const runWithDeadlineAfter = async (
      ms: number,
      customRules: CustomResolutionRule[],
      options: RunOptions = {}
    ) => {
      const pending = run(customRules, { ...options, deadline: Date.now() + ms });
      await jest.advanceTimersByTimeAsync(ms);
      return pending;
    };

    it('starts no custom rule once the deadline has passed, but still prunes deleted ones', async () => {
      const { rules, logger } = await run([rule('a')], {
        previous: watermarked('deleted'),
        deadline: Date.now() - 1,
      });

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

      const { rules, logger } = await runWithDeadlineAfter(1_000, [rule('a'), rule('b')], {
        previous,
      });

      expect(calledRuleIds()).toEqual(['custom:a']);
      expect(rules['custom:a']).toEqual({
        ...previous['custom:a'],
        lastAttemptAt: '2026-10-13T10:00:00.000Z',
        lastStartedFirstAt: '2026-10-13T10:00:00.000Z',
        deferredByDeadline: true,
        lastError: null,
      });
      expect(rules['custom:b']).toEqual({ ...previous['custom:b'], deferredByDeadline: true });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('custom:a: stopped at the soft deadline')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('1 rule(s) continue next run')
      );
    });

    it('does not defer a rule that finished when the deadline fires during the final refresh', async () => {
      const refresh = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 2_000)));
      const pending = run([rule('a')], { deadline: Date.now() + 1_000, refresh });
      await jest.advanceTimersByTimeAsync(2_000);
      const { rules, logger } = await pending;

      expect(rules['custom:a']).toMatchObject({ ...WATERMARKED, deferredByDeadline: false });
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('stopped at the soft deadline')
      );
    });

    it('does not report a query cut off by the deadline as a failure', async () => {
      (runEsqlMatcherRule as jest.Mock).mockImplementationOnce(async (deps) => {
        await runUntilAborted(deps);
        throw new Error('Request aborted');
      });
      const { logger } = await runWithDeadlineAfter(1_000, [rule('a')]);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('runs the oldest rule first, whatever the earlier runs, and logs the order', async () => {
      const { logger } = await run(
        [
          rule('c', { created_at: '2026-10-03T00:00:00Z' }),
          rule('a', { created_at: '2026-10-01T00:00:00Z' }),
          rule('b', { created_at: '2026-10-02T00:00:00Z' }),
        ],
        {
          previous: {
            ...watermarked('a', '2026-10-13T10:05:00Z'),
            ...watermarked('b', '2026-10-13T10:00:00Z'),
            ...watermarked('c', '2026-10-13T09:55:00Z'),
          },
        }
      );

      expect(calledRuleIds()).toEqual(['custom:a', 'custom:b', 'custom:c']);
      expect(logger.info).toHaveBeenCalledWith(
        'Custom resolution rules this run, in order: custom:a, custom:b, custom:c'
      );
    });

    it('runs rules the deadline deferred last run before the others', async () => {
      await run(
        [
          rule('a', { created_at: '2026-10-01T00:00:00Z' }),
          rule('b', { created_at: '2026-10-02T00:00:00Z' }),
        ],
        { previous: { ...watermarked('a'), ...watermarked('b', null, true) } }
      );

      expect(calledRuleIds()).toEqual(['custom:b', 'custom:a']);
    });

    it('leads with the deferred rule that least recently ran first', async () => {
      await run(
        [
          rule('a', { created_at: '2026-10-01T00:00:00Z' }),
          rule('b', { created_at: '2026-10-02T00:00:00Z' }),
          rule('c', { created_at: '2026-10-03T00:00:00Z' }),
        ],
        {
          previous: {
            ...watermarked('a', '2026-10-13T10:05:00Z', true),
            ...watermarked('b', '2026-10-13T10:00:00Z', true),
            ...watermarked('c', null, true),
          },
        }
      );

      expect(calledRuleIds()).toEqual(['custom:c', 'custom:b', 'custom:a']);
    });

    it('gives every rule a full turn when one rule takes most of the budget', async () => {
      const completed: string[] = [];
      (runEsqlMatcherRule as jest.Mock).mockImplementation(
        ({ ruleId, signal, state }: { ruleId: string; signal: AbortSignal; state: PerRuleState }) =>
          new Promise<PerRuleState>((resolve) => {
            const timer = setTimeout(() => {
              completed.push(ruleId);
              resolve(WATERMARKED);
            }, 600);
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              resolve(state);
            });
          })
      );
      const customRules = [
        rule('a', { created_at: '2026-10-01T00:00:00Z' }),
        rule('b', { created_at: '2026-10-02T00:00:00Z' }),
        rule('c', { created_at: '2026-10-03T00:00:00Z' }),
      ];

      let previous: Record<string, PerRuleState> = {};
      for (let tick = 0; tick < 4; tick++) {
        ({ rules: previous } = await runWithDeadlineAfter(1_000, customRules, { previous }));
        await jest.advanceTimersByTimeAsync(60_000);
      }

      expect(completed).toEqual(['custom:a', 'custom:b', 'custom:c', 'custom:a']);
    });

    it('treats a task abort as an abort, not as reaching the deadline', async () => {
      const controller = new AbortController();
      (runEsqlMatcherRule as jest.Mock).mockImplementationOnce(async (deps) => {
        controller.abort();
        return runUntilAborted(deps);
      });
      const { rules, logger } = await run([rule('a'), rule('b')], { signal: controller.signal });

      expect(calledRuleIds()).toEqual(['custom:a']);
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('soft deadline'));
      expect(rules['custom:a']).toMatchObject({ deferredByDeadline: false });
      expect(rules['custom:b']).toBeUndefined();
    });
  });
});
