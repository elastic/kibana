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
import { resetKnowledgeIndicators } from './reset_knowledge_indicators';

jest.mock('../knowledge_indicator_client/revision_reader', () => ({
  fetchAllRuleIdsClusterWide: jest.fn(),
}));

import { fetchAllRuleIdsClusterWide } from '../knowledge_indicator_client/revision_reader';

const MARKETING = brandSpaceId('marketing');

function makeRulesClient(ruleIdsByPrefix: Record<string, string[]> = {}) {
  return {
    findRuleIdsByTagPrefix: jest
      .fn()
      .mockImplementation(async (prefix: string) => ruleIdsByPrefix[prefix] ?? []),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IRulesManagementClient>;
}

function makeDeps({
  spaceIds = [DEFAULT_SPACE_ID, MARKETING],
  spacesFailure,
  rulesClients = {},
}: {
  spaceIds?: SpaceId[];
  spacesFailure?: { target: string; error: string };
  rulesClients?: Partial<Record<string, jest.Mocked<IRulesManagementClient>>>;
} = {}) {
  const deleteByQuery = jest
    .fn()
    .mockResolvedValueOnce({ deleted: 42 })
    .mockResolvedValueOnce({ deleted: 7 });
  const esClient = { deleteByQuery } as unknown as ElasticsearchClient;
  const streamsKIsOnboardingClient = { cancelAllRunning: jest.fn().mockResolvedValue(3) };
  const deleteLegacyRules = jest.fn().mockResolvedValue(undefined);
  const getRulesManagementClientInSpace = jest
    .fn()
    .mockImplementation(async (spaceId: string) => rulesClients[spaceId] ?? makeRulesClient());

  return {
    deleteByQuery,
    streamsKIsOnboardingClient,
    deleteLegacyRules,
    getRulesManagementClientInSpace,
    deps: {
      esClient,
      logger: loggerMock.create(),
      request: {} as KibanaRequest,
      streamsKIsOnboardingClient: streamsKIsOnboardingClient as never,
      getAllSpaceIds: jest.fn().mockResolvedValue({ spaceIds, failure: spacesFailure }),
      getRulesManagementClientInSpace,
      deleteLegacyRules,
    },
  };
}

beforeEach(() => {
  (fetchAllRuleIdsClusterWide as jest.Mock).mockReset().mockResolvedValue(['legacy-1']);
});

describe('resetKnowledgeIndicators', () => {
  it('deletes v1 rules, then owned rules in every space, then every document', async () => {
    const defaultRules = makeRulesClient({
      [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['r1', 'r2'],
      [LEGACY_RULE_STREAM_TAG_PREFIX]: ['r2', 'r3'],
    });
    const marketingRules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['m1'] });
    const { deps, deleteByQuery, deleteLegacyRules, streamsKIsOnboardingClient } = makeDeps({
      rulesClients: { [DEFAULT_SPACE_ID]: defaultRules, [MARKETING]: marketingRules },
    });

    const result = await resetKnowledgeIndicators(deps);

    expect(streamsKIsOnboardingClient.cancelAllRunning).toHaveBeenCalledTimes(1);
    expect(deleteLegacyRules).toHaveBeenCalledWith(['legacy-1']);
    // Both ownership prefixes are swept and duplicates collapse to one delete per space.
    expect(defaultRules.bulkDeleteRules).toHaveBeenCalledWith(['r1', 'r2', 'r3']);
    expect(marketingRules.bulkDeleteRules).toHaveBeenCalledWith(['m1']);

    expect(deleteByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: KNOWLEDGE_INDICATORS_DATA_STREAM,
        query: { match_all: {} },
        conflicts: 'proceed',
      }),
      { ignore: [404] }
    );
    expect(result).toEqual({
      canceled_onboarding_count: 3,
      spaces: [DEFAULT_SPACE_ID, MARKETING],
      deleted: { documents: 42, rules: 4, alerts_v1: 7 },
      failures: [],
    });
  });

  it('deletes rules before documents so a rule failure keeps the reset retryable', async () => {
    const order: string[] = [];
    const rules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['r1'] });
    rules.bulkDeleteRules.mockImplementation(async () => {
      order.push('rules');
    });
    const { deps, deleteByQuery } = makeDeps({
      spaceIds: [DEFAULT_SPACE_ID],
      rulesClients: { [DEFAULT_SPACE_ID]: rules },
    });
    deleteByQuery.mockReset().mockImplementation(async () => {
      order.push('documents');
      return { deleted: 0 };
    });

    await resetKnowledgeIndicators(deps);

    expect(order).toEqual(['rules', 'documents', 'documents']);
  });

  it('records a per-space failure and keeps sweeping the other spaces', async () => {
    const marketingRules = makeRulesClient({ [NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX]: ['m1'] });
    const { deps, getRulesManagementClientInSpace } = makeDeps({
      rulesClients: { [MARKETING]: marketingRules },
    });
    getRulesManagementClientInSpace.mockImplementation(async (spaceId: string) => {
      if (spaceId === DEFAULT_SPACE_ID) {
        throw new Error('forbidden');
      }
      return marketingRules;
    });

    const result = await resetKnowledgeIndicators(deps);

    expect(marketingRules.bulkDeleteRules).toHaveBeenCalledWith(['m1']);
    expect(result.failures).toEqual([{ target: `rules:${DEFAULT_SPACE_ID}`, error: 'forbidden' }]);
    expect(result.deleted.rules).toBe(1);
  });

  it('surfaces the space enumeration failure instead of silently shrinking to one space', async () => {
    const failure = { target: 'spaces', error: 'Spaces client is not available' };
    const { deps } = makeDeps({ spaceIds: [DEFAULT_SPACE_ID], spacesFailure: failure });

    const result = await resetKnowledgeIndicators(deps);

    expect(result.spaces).toEqual([DEFAULT_SPACE_ID]);
    expect(result.failures).toEqual([failure]);
  });

  it('does not call the v1 client when there are no rule ids to delete', async () => {
    (fetchAllRuleIdsClusterWide as jest.Mock).mockResolvedValue([]);
    const { deps, deleteLegacyRules } = makeDeps({ spaceIds: [DEFAULT_SPACE_ID] });

    await resetKnowledgeIndicators(deps);

    expect(deleteLegacyRules).toHaveBeenCalledWith([]);
  });
});
