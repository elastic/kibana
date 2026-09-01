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
  } as unknown as jest.Mocked<ElasticsearchClient>);

const runConfig = async (
  esClient: ElasticsearchClient,
  persistedState: unknown,
  effectiveRules = DEFAULT_EFFECTIVE_RULES,
  signal: AbortSignal = new AbortController().signal
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

  it('runs every watermarked matcher rule and skips related_user when disabled', async () => {
    const esClient = createEsClient();
    const result = await runConfig(esClient, {
      version: AUTOMATED_RESOLUTION_STATE_VERSION,
      rules: watermarkedRules,
    });

    expect(runEsqlMatcherRule).toHaveBeenCalledTimes(MATCHER_RULE_IDS.length);
    expect(runRelatedUserAliasResolution).not.toHaveBeenCalled();
    expect(esClient.indices.refresh).toHaveBeenCalledTimes(MATCHER_RULE_IDS.length);
    expect(result.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(result.rules[EMAIL_RULE]).toEqual(matcherState);
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
