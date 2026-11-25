/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { isDefaultRule } from '../../../../common/rules';
import type { BoostProfile, BoostProfileType, BoostRule } from '../../../../common/types';
import { getLabeledProfileMessage } from '../../../../public/translations';
import { getBoostTestData } from '../../common/boost_test_data';
import { SEARCH_BOOST_READ_ROLE } from '../../common/roles';
import { test } from '../fixtures';

const testData = getBoostTestData('scout-ui-defaults');
// No rule of this suite matches this index until the test adds `coveringRule`.
const uncoveredIndex = `${testData.namespace}-uncovered`;
const coveringRule = `${testData.namespace}-covering`;

const removeCoverageTestData = async (esClient: EsClient) => {
  await esClient.transport.request(
    { method: 'DELETE', path: `/_boost/rule/${coveringRule}` },
    { ignore: [404] }
  );
  await esClient.indices.delete({ index: uncoveredIndex }, { ignore: [404] });
};

type ExplainBoostResponse = Record<string, { matches: Array<{ name: string }> }>;

/**
 * Each type's default rule. Elasticsearch picks the profile of a default rule from the project's
 * search power and boost window, so the test reads it instead of assuming one.
 */
const getDefaultRules = async (
  esClient: EsClient
): Promise<Record<BoostProfileType, BoostRule>> => {
  // Both responses key each profile or rule by its name.
  const [profiles, rules] = await Promise.all([
    esClient.transport.request<Record<string, Pick<BoostProfile, 'type'>>>({
      method: 'GET',
      path: '/_boost/profile',
    }),
    esClient.transport.request<Record<string, BoostRule>>({ method: 'GET', path: '/_boost/rule' }),
  ]);
  const getDefaultRule = (type: BoostProfileType) => {
    const defaultRule = Object.values(rules).find(
      (rule) => isDefaultRule(rule) && profiles[rule.boost_profile]?.type === type
    );
    if (!defaultRule) {
      throw new Error(`Elasticsearch returned no default rule for ${type}`);
    }
    return defaultRule;
  };
  return { indices: getDefaultRule('indices'), data_streams: getDefaultRule('data_streams') };
};

/** What a card shows as its profile: the profile's label, or its name when it has none. */
const getProfileTitle = ({ boost_profile: profileName }: BoostRule) =>
  getLabeledProfileMessage(profileName)?.label ?? profileName;

/** A priority above every rule's, so a new rule outranks any other rule matching its targets. */
const getTopPriority = async (esClient: EsClient) => {
  const rules = await esClient.transport.request<Record<string, Pick<BoostRule, 'priority'>>>({
    method: 'GET',
    path: '/_boost/rule',
  });
  return Math.max(-1, ...Object.values(rules).map(({ priority }) => priority)) + 1;
};

/** The rule that applies to the target, which Elasticsearch lists first. */
const getAppliedRuleName = async (esClient: EsClient, target: string) => {
  const explained = await esClient.transport.request<ExplainBoostResponse>({
    method: 'GET',
    path: `/_boost/explain/${target}`,
  });
  return explained[target].matches[0]?.name;
};

test.describe('Search boost project defaults', { tag: ['@local-serverless-vectordb'] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await removeCoverageTestData(esClient);
    await testData.setUp(esClient);
    await esClient.indices.create({ index: uncoveredIndex, settings: { 'index.hidden': true } });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_ROLE);
  });

  test.afterAll(async ({ esClient }) => {
    await removeCoverageTestData(esClient);
    await testData.tearDown(esClient);
  });

  test('shows what each default applies to', async ({ esClient, page, pageObjects }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoTab('rules');

    const defaultRules = await getDefaultRules(esClient);

    await test.step('shows the profile each default rule points to', async () => {
      await expect(searchBoost.projectDefaultValue('indices')).toHaveText(
        getProfileTitle(defaultRules.indices)
      );
      await expect(searchBoost.projectDefaultValue('data_streams')).toHaveText(
        getProfileTitle(defaultRules.data_streams)
      );
    });

    await test.step('lists the data streams the default rule matches', async () => {
      await searchBoost.projectDefaultCount('data_streams').click();
      await expect(searchBoost.matchesPopoverItem(testData.dataStream)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(searchBoost.matchesPopover).toBeHidden();
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="searchBoostProjectDefaults"]'],
      });
      expect(violations).toStrictEqual([]);
    });

    await test.step('lists a hidden index, outranked only if another rule applies', async () => {
      // A rule outside this suite may already cover the index, so Elasticsearch says which applies.
      const isOutranked =
        (await getAppliedRuleName(esClient, uncoveredIndex)) !== defaultRules.indices.name;
      await searchBoost.projectDefaultCount('indices').click();
      const item = searchBoost.matchesPopoverItem(uncoveredIndex);
      await expect(item).toBeVisible();
      await expect(item.getByTestId('searchBoostMatchesPopoverOutrankedIcon')).toHaveCount(
        Number(isOutranked)
      );
    });

    await test.step('shows the index as outranked by the rule that covers it', async () => {
      await esClient.transport.request({
        method: 'PUT',
        path: `/_boost/rule/${coveringRule}`,
        body: {
          index_pattern: uncoveredIndex,
          boost_profile: testData.indicesProfile,
          priority: await getTopPriority(esClient),
        },
      });
      expect(await getAppliedRuleName(esClient, uncoveredIndex)).toBe(coveringRule);
      await page.reload();

      await searchBoost.projectDefaultCount('indices').click();
      await searchBoost
        .matchesPopoverItem(uncoveredIndex)
        .getByTestId('searchBoostMatchesPopoverOutrankedIcon')
        .hover();
      await expect(page.getByRole('tooltip')).toContainText(coveringRule);
    });
  });
});
