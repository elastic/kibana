/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type {
  BoostRuleListItem,
  GetBoostProfilesResponse,
  GetBoostRulesResponse,
} from '../../../../common/types';
import { getBoostTestData } from '../../common/boost_test_data';
import {
  ONLY_READ_BOOST_PROFILES_ROLE,
  ONLY_READ_BOOST_RULES_ROLE,
  SEARCH_BOOST_READ_ROLE,
  SEARCH_BOOST_READ_WITHOUT_INDICES_ROLE,
} from '../../common/roles';
import { COMMON_HEADERS, PROFILES_PATH, RULES_PATH, apiTest } from '../fixtures';

const testData = getBoostTestData('scout-api');

const getMatchNames = (rule?: BoostRuleListItem) =>
  rule?.matches.map(({ name, outrankedByRuleName }) => ({ name, outrankedByRuleName }));

type ExplainBoostResponse = Record<string, { matches: Array<{ name: string }> }>;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

apiTest.describe('Search boost list API', { tag: ['@local-serverless-vectordb'] }, () => {
  let readHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    await testData.setUp(esClient);
    const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(SEARCH_BOOST_READ_ROLE);
    readHeaders = { ...COMMON_HEADERS, ...apiKeyHeader };
  });

  apiTest.afterAll(async ({ esClient }) => {
    await testData.tearDown(esClient);
  });

  apiTest('lists the profiles', async ({ apiClient }) => {
    const response = await apiClient.get(PROFILES_PATH, {
      headers: readHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { profiles } = response.body as GetBoostProfilesResponse;
    expect(profiles.find(({ name }) => name === testData.indicesProfile)).toStrictEqual({
      name: testData.indicesProfile,
      type: 'indices',
      is_builtin: false,
      min_boost: 1,
      max_boost: 2,
      availability: 'base',
      prewarm: true,
      pinned: false,
    });
    expect(profiles.find(({ name }) => name === testData.dataStreamsProfile)?.type).toBe(
      'data_streams'
    );
  });

  apiTest(
    'lists the rules with the indices and data streams each applies to',
    async ({ apiClient }) => {
      const response = await apiClient.get(RULES_PATH, {
        headers: readHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { rules } = response.body as GetBoostRulesResponse;
      const getRule = (ruleName: string) => rules.find(({ name }) => name === ruleName);

      expect(getRule(testData.exactRule)?.type).toBe('indices');
      expect(getMatchNames(getRule(testData.exactRule))).toStrictEqual([
        { name: testData.productsIndex, outrankedByRuleName: undefined },
      ]);
      // A hidden regular index counts; the exact name outranks the pattern.
      expect(getMatchNames(getRule(testData.patternRule))).toStrictEqual(
        expect.arrayContaining([
          { name: testData.productsIndex, outrankedByRuleName: testData.exactRule },
          { name: testData.reviewsIndex, outrankedByRuleName: undefined },
          { name: testData.hiddenIndex, outrankedByRuleName: undefined },
        ])
      );
      expect(getRule(testData.patternRule)?.matches).toHaveLength(3);
      expect(
        getRule(testData.patternRule)?.matches.find(({ name }) => name === testData.hiddenIndex)
          ?.isHidden
      ).toBe(true);

      // A higher priority beats a more specific pattern.
      expect(getMatchNames(getRule(testData.priorityExactRule))).toStrictEqual([
        { name: testData.priorityIndex, outrankedByRuleName: testData.priorityWildcardRule },
      ]);

      // Backing indices are left out: the rule applies to the data stream itself.
      expect(getRule(testData.dataStreamsRule)?.type).toBe('data_streams');
      expect(getMatchNames(getRule(testData.dataStreamsRule))).toStrictEqual([
        { name: testData.dataStream, outrankedByRuleName: undefined },
      ]);

      // No rule applies to backing or system indices.
      const allMatches = rules.flatMap(({ matches }) => matches.map(({ name }) => name));
      expect(allMatches.filter((name) => name.startsWith('.ds-'))).toStrictEqual([]);
      expect(allMatches.filter((name) => name.startsWith('.kibana_'))).toStrictEqual([]);
    }
  );

  apiTest('ranks the rules the same way as Elasticsearch', async ({ apiClient, esClient }) => {
    const response = await apiClient.get(RULES_PATH, {
      headers: readHeaders,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const { rules } = response.body as GetBoostRulesResponse;

    for (const target of [
      testData.productsIndex,
      testData.reviewsIndex,
      testData.hiddenIndex,
      testData.priorityIndex,
      testData.dataStream,
    ]) {
      const explained = await esClient.transport.request<ExplainBoostResponse>({
        method: 'GET',
        path: `/_boost/explain/${target}`,
      });
      // Elasticsearch lists the matching rules by rank, and the first one applies.
      const [appliedRule, ...outrankedRules] = explained[target].matches.map(({ name }) => name);
      const matchingRules = rules.flatMap(({ name, matches }) =>
        matches
          .filter((match) => match.name === target)
          .map(({ outrankedByRuleName }) => ({ name, outrankedByRuleName }))
      );

      expect(matchingRules.sort(byName)).toStrictEqual(
        [
          { name: appliedRule, outrankedByRuleName: undefined },
          ...outrankedRules.map((name) => ({ name, outrankedByRuleName: appliedRule })),
        ].sort(byName)
      );
    }
  });

  apiTest(
    'lists the rules without matches to a user without index privileges',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        SEARCH_BOOST_READ_WITHOUT_INDICES_ROLE
      );
      const response = await apiClient.get(RULES_PATH, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { rules } = response.body as GetBoostRulesResponse;
      expect(rules.find(({ name }) => name === testData.patternRule)?.matches).toStrictEqual([]);
    }
  );

  for (const { path, role, missingPrivilege } of [
    {
      path: PROFILES_PATH,
      role: ONLY_READ_BOOST_RULES_ROLE,
      missingPrivilege: 'read_boost_profiles',
    },
    { path: RULES_PATH, role: ONLY_READ_BOOST_PROFILES_ROLE, missingPrivilege: 'read_boost_rules' },
  ]) {
    apiTest(
      `responds 403 to ${path} without ${missingPrivilege}`,
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
        const response = await apiClient.get(path, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
});
