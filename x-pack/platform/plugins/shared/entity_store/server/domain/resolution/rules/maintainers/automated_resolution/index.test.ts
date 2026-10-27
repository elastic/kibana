/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityMaintainerTaskMethodContext } from '../../../../../tasks/entity_maintainers/types';
import {
  RESOLUTION_RULE_IDS,
  RESOLUTION_RULE_KINDS,
} from '../../../../../../common/domain/resolution_rules/constants';
import { automatedResolutionMaintainerConfig, MAINTAINER_ID } from '.';
import { runRelatedUserAliasResolution } from '../related_user_alias_resolution';
import { runEsqlMatcherRule } from '../../matcher';
import { AUTOMATED_RESOLUTION_STATE_VERSION, type AutomatedResolutionState } from './types';
import { resolveLatestEntitiesIndexName } from '../../../../asset_manager/resolve_entity_store_indices';
import * as customRules from './custom_rules';
import { RESOLUTION_RULE_CONFIGS } from '../..';

const EMAIL_RULE = RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH;
const ALIAS_RESOLUTION_RULE = RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION;
const NAMESPACE = 'default';

jest.mock('../related_user_alias_resolution', () => ({
  runRelatedUserAliasResolution: jest.fn(),
}));

jest.mock('../../matcher', () => ({
  runEsqlMatcherRule: jest.fn(),
}));

jest.mock('../../../../asset_manager/resolve_entity_store_indices', () => ({
  resolveLatestEntitiesIndexName: jest.fn().mockResolvedValue('.entities.v2.latest.default'),
}));

const matcherState = {
  lastProcessedTimestamp: '2026-03-10T00:00:00Z',
  lastRun: {
    resolutionsCreated: 0,
    skippedAmbiguousBuckets: 0,
    skippedOversizedBuckets: 0,
    skippedNoopBuckets: 0,
    cascadeRetargeted: 0,
    cascadesBlocked: 0,
  },
};

const DEFAULT_EFFECTIVE_RULES = RESOLUTION_RULE_CONFIGS.map((config) => ({
  id: config.id,
  kind: config.kind,
  description: config.description,
  managed: true as const,
  enabled: config.defaultEnabled,
}));

const MATCHER_RULE_IDS = [
  RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
  RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
  RESOLUTION_RULE_IDS.ENTRA_GUID_BRIDGE,
  RESOLUTION_RULE_IDS.CROWDSTRIKE_SID_BRIDGE,
  RESOLUTION_RULE_IDS.UPN_CROSS_FIELD_BRIDGE,
] as const;

const watermarkedRules = Object.fromEntries(MATCHER_RULE_IDS.map((id) => [id, matcherState]));

const createEsClient = () =>
  ({
    search: jest.fn(),
    esql: { query: jest.fn() },
    indices: { refresh: jest.fn().mockResolvedValue({}) },
  }) as unknown as jest.Mocked<ElasticsearchClient>;

const runConfig = async (
  esClient: ElasticsearchClient,
  persistedState: unknown,
  effectiveRules = DEFAULT_EFFECTIVE_RULES,
  signal: AbortSignal = new AbortController().signal,
  getCustomRules: jest.Mock = jest.fn().mockResolvedValue([])
): Promise<AutomatedResolutionState> => {
  const context = {
    status: {
      metadata: {
        namespace: NAMESPACE,
        runs: 1,
        lastSuccessTimestamp: null,
        lastErrorTimestamp: null,
      },
      state: persistedState,
      taskStatus: 'started',
    },
    signal,
    logger: loggerMock.create(),
    esClient,
    cpsEsClient: esClient,
    resolutionRulesClient: {
      getEffectiveRules: jest.fn().mockResolvedValue(effectiveRules),
      getCustomRules,
      getCustomRule: jest
        .fn()
        .mockImplementation(async (id: string) =>
          ((await getCustomRules().catch(() => [])) as Array<{ id: string }>).find(
            (candidate) => candidate.id === id
          )
        ),
    },
    telemetry: { report: jest.fn() },
  } as unknown as EntityMaintainerTaskMethodContext;

  const result = await automatedResolutionMaintainerConfig.run(context);
  return result as unknown as AutomatedResolutionState;
};

describe('automatedResolutionMaintainerConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (runEsqlMatcherRule as jest.Mock).mockResolvedValue(matcherState);
    (runRelatedUserAliasResolution as jest.Mock).mockResolvedValue({
      lastProcessedTimestamp: null,
      lastRun: null,
    });
  });

  it('registers under the stable maintainer id and requires enterprise license', () => {
    expect(automatedResolutionMaintainerConfig.id).toBe(MAINTAINER_ID);
    expect(automatedResolutionMaintainerConfig.minLicense).toBe('enterprise');
  });

  it('sets the task timeout the custom-rules deadline is derived from', () => {
    expect(automatedResolutionMaintainerConfig.timeout).toBe('5m');
  });

  it('seeds initialState with versioned empty rules map (rules backfill on first run)', () => {
    const state =
      automatedResolutionMaintainerConfig.initialState as unknown as AutomatedResolutionState;
    expect(state.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(state.rules).toEqual({});
  });

  it('pins the matcher rule ids so adding a rule fails this test on purpose', () => {
    expect(
      RESOLUTION_RULE_CONFIGS.filter((config) => config.matcher).map((config) => config.id)
    ).toEqual([...MATCHER_RULE_IDS]);
  });

  it('runs every default-enabled matcher rule and skips related_user when disabled', async () => {
    const esClient = createEsClient();
    const result = await runConfig(esClient, {
      version: AUTOMATED_RESOLUTION_STATE_VERSION,
      rules: watermarkedRules,
    });

    const defaultEnabledMatcherCount = RESOLUTION_RULE_CONFIGS.filter(
      (config) => config.matcher && config.defaultEnabled
    ).length;
    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(defaultEnabledMatcherCount);
    expect(runRelatedUserAliasResolution).not.toHaveBeenCalled();
    expect(esClient.indices.refresh).toHaveBeenCalledTimes(defaultEnabledMatcherCount);
    expect(result.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(result.rules[EMAIL_RULE]).toEqual(matcherState);
  });

  it('gives every rule the index resolved once for the run, custom rules included', async () => {
    (resolveLatestEntitiesIndexName as jest.Mock).mockResolvedValueOnce('.entities.v2.latest.run');
    await runConfig(
      createEsClient(),
      { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: watermarkedRules },
      DEFAULT_EFFECTIVE_RULES.map((rule) => ({ ...rule, enabled: true })),
      undefined,
      jest.fn().mockResolvedValue([
        {
          id: 'rule-1',
          name: 'custom',
          namespaces: ['local', 'active_directory'],
          match_value: 'TO_LOWER(user.name)',
          decline_same_namespace_duplicates: true,
          enabled: true,
        },
      ])
    );

    expect((runEsqlMatcherRule as jest.Mock).mock.calls.map(([deps]) => deps.ruleId)).toContain(
      'custom:rule-1'
    );

    const indexes = [
      ...(runEsqlMatcherRule as jest.Mock).mock.calls.map(([deps]) => deps.index),
      ...(runRelatedUserAliasResolution as jest.Mock).mock.calls.map(([deps]) => deps.index),
    ];
    expect(indexes.length).toBeGreaterThan(1);
    expect(new Set(indexes)).toEqual(new Set(['.entities.v2.latest.run']));
    expect(resolveLatestEntitiesIndexName).toHaveBeenCalledTimes(1);
  });

  it('serializes one null-watermark backfill per tick', async () => {
    const esClient = createEsClient();
    const first = await runConfig(esClient, {
      version: AUTOMATED_RESOLUTION_STATE_VERSION,
      rules: {},
    });

    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(1);
    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].ruleId).toBe(EMAIL_RULE);
    expect(first.rules[RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE]).toBeUndefined();

    (runEsqlMatcherRule as jest.Mock).mockClear();
    await runConfig(esClient, {
      version: AUTOMATED_RESOLUTION_STATE_VERSION,
      rules: { [EMAIL_RULE]: matcherState },
    });

    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(2);
    expect((runEsqlMatcherRule as jest.Mock).mock.calls.map((call) => call[0].ruleId)).toEqual([
      EMAIL_RULE,
      RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
    ]);
  });

  it('does not start the next rule when the task has been aborted', async () => {
    const esClient = createEsClient();
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    await runConfig(
      esClient,
      { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: watermarkedRules },
      DEFAULT_EFFECTIVE_RULES,
      abortCtrl.signal
    );

    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
  });

  it('migrates legacy single-rule state and resets the email watermark before running', async () => {
    const esClient = createEsClient();

    await runConfig(esClient, {
      lastProcessedTimestamp: '2026-01-01T00:00:00Z',
      lastRun: null,
    });

    const emailCall = (runEsqlMatcherRule as jest.Mock).mock.calls.find(
      (call) => call[0].ruleId === EMAIL_RULE
    );
    expect(emailCall[0].state.lastProcessedTimestamp).toBeNull();
  });

  it.each(RESOLUTION_RULE_CONFIGS.filter((config) => config.matcher).map((config) => config.id))(
    'skips disabled matcher rule %s and preserves its existing state',
    async (ruleId) => {
      const esClient = createEsClient();
      const ruleState = {
        lastProcessedTimestamp: '2026-06-01T00:00:00Z',
        lastRun: {
          resolutionsCreated: 10,
          skippedAmbiguousBuckets: 1,
          skippedOversizedBuckets: 0,
          skippedNoopBuckets: 0,
          cascadeRetargeted: 0,
          cascadesBlocked: 0,
        },
      };

      const result = await runConfig(
        esClient,
        { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: { [ruleId]: ruleState } },
        DEFAULT_EFFECTIVE_RULES.map((rule) =>
          rule.id === ruleId ? { ...rule, enabled: false } : rule
        )
      );

      const ruleCalls = (runEsqlMatcherRule as jest.Mock).mock.calls.filter(
        (call) => call[0].ruleId === ruleId
      );
      expect(ruleCalls).toHaveLength(0);
      expect(result.rules[ruleId]).toEqual(ruleState);
    }
  );

  it('skips disabled alias resolution rule and preserves its existing state', async () => {
    const esClient = createEsClient();
    const aliasResolutionState = {
      lastProcessedTimestamp: '2026-06-01T00:00:00Z',
      lastRun: {
        seedsScanned: 10,
        linksCreated: 2,
      },
    };

    const result = await runConfig(
      esClient,
      {
        version: AUTOMATED_RESOLUTION_STATE_VERSION,
        rules: { [ALIAS_RESOLUTION_RULE]: aliasResolutionState },
      },
      DEFAULT_EFFECTIVE_RULES.map((rule) => ({ ...rule, enabled: false }))
    );

    expect(runRelatedUserAliasResolution).not.toHaveBeenCalled();
    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
    expect(result.rules[ALIAS_RESOLUTION_RULE]).toEqual(aliasResolutionState);
  });

  it('runs related_user in the same tick as a matcher backfill', async () => {
    const esClient = createEsClient();
    const enabled = DEFAULT_EFFECTIVE_RULES.map((rule) =>
      rule.id === ALIAS_RESOLUTION_RULE ? { ...rule, enabled: true } : rule
    );

    await runConfig(esClient, { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: {} }, enabled);

    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(1);
    expect((runEsqlMatcherRule as jest.Mock).mock.calls[0][0].ruleId).toBe(EMAIL_RULE);
    expect(runRelatedUserAliasResolution).toHaveBeenCalledTimes(1);
  });

  describe('custom rules', () => {
    const customRule = {
      id: 'rule-1',
      name: 'CrowdStrike local users to AD',
      namespaces: ['local', 'active_directory'],
      match_value: 'TO_LOWER(user.name)',
      decline_same_namespace_duplicates: true,
      enabled: true,
    };
    const persisted = { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: watermarkedRules };

    it('runs saved custom rules after every OOTB rule', async () => {
      const esClient = createEsClient();
      const result = await runConfig(
        esClient,
        persisted,
        DEFAULT_EFFECTIVE_RULES,
        undefined,
        jest.fn().mockResolvedValue([customRule])
      );

      const ruleIds = (runEsqlMatcherRule as jest.Mock).mock.calls.map((call) => call[0].ruleId);
      expect(ruleIds[ruleIds.length - 1]).toBe('custom:rule-1');
      expect(ruleIds.slice(0, -1)).not.toContain('custom:rule-1');
      expect(result.rules['custom:rule-1']).toEqual({
        ...matcherState,
        definitionFingerprint: expect.any(String),
        lastAttemptAt: expect.any(String),
        lastStartedFirstAt: expect.any(String),
        deferredByDeadline: false,
        lastError: null,
      });
    });

    it('stops a hanging custom rule a minute before the task timeout', async () => {
      jest.useFakeTimers({ now: new Date('2026-10-15T10:00:00Z') });
      try {
        let abortedAfterMs: number | undefined;
        (runEsqlMatcherRule as jest.Mock).mockImplementation(
          async ({ ruleId, signal }: { ruleId: string; signal: AbortSignal }) => {
            if (!ruleId.startsWith('custom:')) {
              return matcherState;
            }
            const startedAt = Date.parse('2026-10-15T10:00:00Z');
            return new Promise((resolve) => {
              signal.addEventListener('abort', () => {
                abortedAfterMs = Date.now() - startedAt;
                resolve(matcherState);
              });
            });
          }
        );

        const pending = runConfig(
          createEsClient(),
          persisted,
          DEFAULT_EFFECTIVE_RULES,
          undefined,
          jest.fn().mockResolvedValue([customRule])
        );
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
        const result = await pending;

        expect(abortedAfterMs).toBe(4 * 60 * 1000);
        expect(result.rules['custom:rule-1']).toMatchObject({ deferredByDeadline: true });
        expect(result.rules[EMAIL_RULE]).toEqual(matcherState);
      } finally {
        jest.useRealTimers();
      }
    });

    it('keeps the OOTB results when the custom-rule phase throws', async () => {
      const spy = jest
        .spyOn(customRules, 'runCustomResolutionRules')
        .mockRejectedValueOnce(new Error('unexpected'));
      try {
        const result = await runConfig(
          createEsClient(),
          persisted,
          DEFAULT_EFFECTIVE_RULES,
          undefined,
          jest.fn().mockResolvedValue([customRule])
        );

        expect(spy).toHaveBeenCalledTimes(1);
        expect(result.rules[EMAIL_RULE]).toEqual(matcherState);
      } finally {
        spy.mockRestore();
      }
    });

    it('leaves OOTB results unchanged when custom rules cannot be loaded', async () => {
      const withoutCustom = await runConfig(createEsClient(), persisted);
      jest.clearAllMocks();
      (runEsqlMatcherRule as jest.Mock).mockResolvedValue(matcherState);

      const withFailure = await runConfig(
        createEsClient(),
        persisted,
        DEFAULT_EFFECTIVE_RULES,
        undefined,
        jest.fn().mockRejectedValue(new Error('403 saved objects'))
      );

      expect(withFailure).toEqual(withoutCustom);
    });

    it('does not let an OOTB rule holding the first-scan slot block a custom rule backfill', async () => {
      const esClient = createEsClient();
      await runConfig(
        esClient,
        { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: {} },
        DEFAULT_EFFECTIVE_RULES,
        undefined,
        jest.fn().mockResolvedValue([customRule])
      );

      expect((runEsqlMatcherRule as jest.Mock).mock.calls.map((call) => call[0].ruleId)).toEqual([
        EMAIL_RULE,
        'custom:rule-1',
      ]);
    });
  });

  it('runs related_user when that rule is enabled', async () => {
    const esClient = createEsClient();
    await runConfig(
      esClient,
      { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules: {} },
      DEFAULT_EFFECTIVE_RULES.map((rule) =>
        rule.id === ALIAS_RESOLUTION_RULE ||
        rule.kind === RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION
          ? { ...rule, enabled: true }
          : { ...rule, enabled: false }
      )
    );

    expect(runRelatedUserAliasResolution).toHaveBeenCalledTimes(1);
    expect(runEsqlMatcherRule).not.toHaveBeenCalled();
  });
});
