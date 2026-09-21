/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { brandSpaceId, DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../data_stream';
import type { IRulesManagementClient } from '../knowledge_indicator_client/rules/rules_management_client';
import {
  LEGACY_RULE_STREAM_TAG_PREFIX,
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
} from '../knowledge_indicator_client/rules/rules_management_client';
import type { SignificantEventsKIsOnboardingClient } from '../../workflows/onboarding_workflow_client';
import { resetKnowledgeIndicators } from './reset_knowledge_indicators';

const MARKETING = brandSpaceId('marketing');
const V1_ALERTS_INDEX = '.alerts-streams.alerts-default';

function makeRulesClient(ruleIdsByPrefix: Record<string, string[]> = {}) {
  return {
    findRuleIdsByTagPrefix: jest
      .fn()
      .mockImplementation(async (prefix: string) => ruleIdsByPrefix[prefix] ?? []),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IRulesManagementClient>;
}

function makeEsClient(deletedByIndex: Record<string, number> = {}) {
  const deleteByQuery = jest.fn().mockImplementation(async ({ index }: { index: string }) => ({
    deleted: deletedByIndex[index] ?? 0,
  }));
  return { deleteByQuery, client: { deleteByQuery } as unknown as ElasticsearchClient };
}

function makeDeps({
  spaceIds = [DEFAULT_SPACE_ID, MARKETING],
  spacesFailure,
  rulesClients = {},
  legacyRuleIds = ['legacy-1'],
}: {
  spaceIds?: SpaceId[];
  spacesFailure?: { target: 'spaces'; error: string };
  rulesClients?: Partial<Record<string, jest.Mocked<IRulesManagementClient>>>;
  legacyRuleIds?: string[];
} = {}) {
  const knowledgeIndicatorsEs = makeEsClient({ [KNOWLEDGE_INDICATORS_DATA_STREAM]: 42 });
  const alertsEs = makeEsClient({ [V1_ALERTS_INDEX]: 7 });
  const streamsKIsOnboardingClient = { cancelAllRunning: jest.fn().mockResolvedValue(3) };
  const deleteLegacyRules = jest.fn().mockResolvedValue(undefined);
  const fetchLegacyRuleIds = jest.fn().mockResolvedValue(legacyRuleIds);
  const getRulesManagementClientInSpace = jest
    .fn()
    .mockImplementation(async (spaceId: string) => rulesClients[spaceId] ?? makeRulesClient());

  return {
    knowledgeIndicatorsDeleteByQuery: knowledgeIndicatorsEs.deleteByQuery,
    alertsDeleteByQuery: alertsEs.deleteByQuery,
    streamsKIsOnboardingClient,
    deleteLegacyRules,
    fetchLegacyRuleIds,
    getRulesManagementClientInSpace,
    deps: {
      knowledgeIndicatorsEsClient: knowledgeIndicatorsEs.client,
      alertsEsClient: alertsEs.client,
      logger: loggerMock.create(),
      request: {} as KibanaRequest,
      streamsKIsOnboardingClient:
        streamsKIsOnboardingClient as unknown as SignificantEventsKIsOnboardingClient,
      fetchLegacyRuleIds,
      getAllSpaceIds: jest.fn().mockResolvedValue({ spaceIds, failure: spacesFailure }),
      getRulesManagementClientInSpace,
      deleteLegacyRules,
    },
  };
}

describe('resetKnowledgeIndicators', () => {
  it('deletes v1 rules, then owned rules in every space, then every document', async () => {
    const defaultRules = makeRulesClient({
      [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['r1', 'r2'],
      [LEGACY_RULE_STREAM_TAG_PREFIX]: ['r2', 'r3'],
    });
    const marketingRules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['m1'] });
    const {
      deps,
      knowledgeIndicatorsDeleteByQuery,
      alertsDeleteByQuery,
      deleteLegacyRules,
      streamsKIsOnboardingClient,
    } = makeDeps({
      rulesClients: { [DEFAULT_SPACE_ID]: defaultRules, [MARKETING]: marketingRules },
    });

    const result = await resetKnowledgeIndicators(deps);

    expect(streamsKIsOnboardingClient.cancelAllRunning).toHaveBeenCalledTimes(1);
    expect(deleteLegacyRules).toHaveBeenCalledWith(['legacy-1']);
    // Both ownership prefixes are swept and duplicates collapse to one delete per space.
    expect(defaultRules.bulkDeleteRules).toHaveBeenCalledWith(['r1', 'r2', 'r3']);
    expect(marketingRules.bulkDeleteRules).toHaveBeenCalledWith(['m1']);

    expect(knowledgeIndicatorsDeleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: KNOWLEDGE_INDICATORS_DATA_STREAM,
        query: { match_all: {} },
        conflicts: 'proceed',
      }),
      { ignore: [404] }
    );
    // The alerts index is not plugin-owned, so its wipe goes through the caller's client.
    expect(alertsDeleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: V1_ALERTS_INDEX }),
      { ignore: [404] }
    );
    expect(result).toEqual({
      completed: true,
      canceled_onboarding_count: 3,
      spaces: [DEFAULT_SPACE_ID, MARKETING],
      deleted: { documents: 42, rules: 4, alerts_v1: 7 },
      failures: [],
    });
  });

  it('deletes rules before documents', async () => {
    const order: string[] = [];
    const rules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['r1'] });
    rules.bulkDeleteRules.mockImplementation(async () => {
      order.push('rules');
    });
    const { deps, knowledgeIndicatorsDeleteByQuery } = makeDeps({
      spaceIds: [DEFAULT_SPACE_ID],
      rulesClients: { [DEFAULT_SPACE_ID]: rules },
    });
    knowledgeIndicatorsDeleteByQuery.mockImplementation(async () => {
      order.push('documents');
      return { deleted: 0 };
    });

    await resetKnowledgeIndicators(deps);

    expect(order).toEqual(['rules', 'documents']);
  });

  it('stops before touching anything when the v1 rule cleanup fails', async () => {
    const { deps, deleteLegacyRules, knowledgeIndicatorsDeleteByQuery, alertsDeleteByQuery } =
      makeDeps();
    deleteLegacyRules.mockRejectedValue(new Error('v1 unavailable'));

    await expect(resetKnowledgeIndicators(deps)).rejects.toThrow('v1 unavailable');

    expect(deps.getRulesManagementClientInSpace).not.toHaveBeenCalled();
    expect(knowledgeIndicatorsDeleteByQuery).not.toHaveBeenCalled();
    expect(alertsDeleteByQuery).not.toHaveBeenCalled();
  });

  it('records a per-space failure, keeps sweeping, and skips the document wipe', async () => {
    const marketingRules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['m1'] });
    const {
      deps,
      getRulesManagementClientInSpace,
      knowledgeIndicatorsDeleteByQuery,
      alertsDeleteByQuery,
    } = makeDeps({ rulesClients: { [MARKETING]: marketingRules } });
    getRulesManagementClientInSpace.mockImplementation(async (spaceId: string) => {
      if (spaceId === DEFAULT_SPACE_ID) {
        throw new Error('forbidden');
      }
      return marketingRules;
    });

    const result = await resetKnowledgeIndicators(deps);

    expect(marketingRules.bulkDeleteRules).toHaveBeenCalledWith(['m1']);
    // The surviving default-space rules are still discoverable through their KI links.
    expect(knowledgeIndicatorsDeleteByQuery).not.toHaveBeenCalled();
    expect(alertsDeleteByQuery).not.toHaveBeenCalled();
    expect(result).toEqual({
      completed: false,
      canceled_onboarding_count: 3,
      spaces: [DEFAULT_SPACE_ID, MARKETING],
      deleted: { documents: 0, rules: 1, alerts_v1: 0 },
      failures: [{ target: `rules:${DEFAULT_SPACE_ID}`, error: 'forbidden' }],
    });
  });

  it('surfaces the space enumeration failure and skips the document wipe', async () => {
    const failure = { target: 'spaces' as const, error: 'Spaces client is not available' };
    const { deps, knowledgeIndicatorsDeleteByQuery } = makeDeps({
      spaceIds: [DEFAULT_SPACE_ID],
      spacesFailure: failure,
    });

    const result = await resetKnowledgeIndicators(deps);

    expect(result.completed).toBe(false);
    expect(result.spaces).toEqual([DEFAULT_SPACE_ID]);
    expect(result.failures).toEqual([failure]);
    expect(knowledgeIndicatorsDeleteByQuery).not.toHaveBeenCalled();
  });

  it('passes an empty id list to the v1 client when no rule id was ever recorded', async () => {
    const { deps, deleteLegacyRules } = makeDeps({
      spaceIds: [DEFAULT_SPACE_ID],
      legacyRuleIds: [],
    });

    await resetKnowledgeIndicators(deps);

    expect(deleteLegacyRules).toHaveBeenCalledWith([]);
  });
});
