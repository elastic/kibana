/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { escapeRegExp } from 'lodash';
import { getBoostTestData } from '../../common/boost_test_data';
import {
  SEARCH_BOOST_READ_DELETE_DATA_STREAMS_ROLE,
  SEARCH_BOOST_READ_ROLE,
  SEARCH_BOOST_READ_WITH_INDEX_MANAGEMENT_ROLE,
} from '../../common/roles';
import { test } from '../fixtures';

const testData = getBoostTestData('scout-ui-details');

test.describe('Search boost details pages', { tag: ['@local-serverless-vectordb'] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await testData.setUp(esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_ROLE);
  });

  test.afterAll(async ({ esClient }) => {
    await testData.tearDown(esClient);
  });

  test('opens a rule from its table and shows what it applies to', async ({
    page,
    pageObjects,
  }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoTab('rules');
    await searchBoost.search(testData.namespace);

    await test.step('opens the rule from its name', async () => {
      await searchBoost
        .row(searchBoost.rulesTable, testData.patternRule)
        .getByTestId('searchBoostRuleLink')
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/search_boost/rules/${escapeRegExp(testData.patternRule)}$`)
      );
      await expect(searchBoost.headerTitle).toHaveText(testData.patternRule);
    });

    await test.step('lists the matching indices', async () => {
      await expect(
        searchBoost.matchesTable.getByText(testData.productsIndex, { exact: true })
      ).toBeVisible();
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('shows index names as text without access to Index Management', async () => {
      await expect(searchBoost.matchLink(testData.reviewsIndex)).toBeVisible();
      for (const role of ['link', 'button'] as const) {
        await expect(
          searchBoost.matchesTable.getByRole(role, { name: testData.reviewsIndex, exact: true })
        ).toHaveCount(0);
      }
    });
  });

  test('opens an index in Index Management for users who can open it', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { searchBoost } = pageObjects;
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_WITH_INDEX_MANAGEMENT_ROLE);
    await searchBoost.gotoDetails('rules', testData.patternRule);

    await searchBoost.matchLink(testData.reviewsIndex).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/index_management/indices/index_details\\?indexName=${escapeRegExp(testData.reviewsIndex)}`
      )
    );
    await expect(page.getByTestId('indexDetailsContent')).toBeVisible();
  });

  test('opens a data stream in a flyout over the rule', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { searchBoost } = pageObjects;
    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_WITH_INDEX_MANAGEMENT_ROLE);
    await searchBoost.gotoDetails('rules', testData.dataStreamsRule);

    await searchBoost.matchLink(testData.dataStream).click();

    await expect(searchBoost.dataStreamFlyout).toBeVisible();
    await expect(searchBoost.dataStreamFlyout.getByTestId('dataStreamDetailPanelTitle')).toHaveText(
      testData.dataStream
    );
    // The title also shows while loading and on errors.
    await expect(searchBoost.dataStreamFlyout.getByTestId('indicesDetail')).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/search_boost/rules/${escapeRegExp(testData.dataStreamsRule)}$`)
    );
  });

  test('loads again once the data stream is deleted from the flyout', async ({
    browserAuth,
    esClient,
    page,
    pageObjects,
  }) => {
    const { searchBoost } = pageObjects;
    const { deletableDataStream } = testData;
    await esClient.indices.createDataStream({ name: deletableDataStream });

    await browserAuth.loginWithCustomRole(SEARCH_BOOST_READ_DELETE_DATA_STREAMS_ROLE);
    await searchBoost.gotoDetails('rules', testData.dataStreamsRule);
    await searchBoost.matchLink(deletableDataStream).click();
    await expect(searchBoost.dataStreamFlyout).toBeVisible();

    await page.testSubj.locator('manageDataStreamButton').click();
    await page.testSubj.locator('deleteDataStreamButton').click();
    await page.testSubj.locator('confirmModalConfirmButton').click();

    await expect(searchBoost.dataStreamFlyout).toBeHidden();
    await expect(searchBoost.matchLink(deletableDataStream)).toBeHidden();
    await expect(searchBoost.matchLink(testData.dataStream)).toBeVisible();
  });

  test("opens a rule's profile and lists the rules using it", async ({ page, pageObjects }) => {
    const { searchBoost } = pageObjects;
    await searchBoost.gotoDetails('rules', testData.patternRule);

    await test.step("opens the profile from the rule's settings", async () => {
      await searchBoost.setting(searchBoost.ruleSettings, 'profile').getByRole('link').click();
      await expect(searchBoost.headerTitle).toHaveText(testData.indicesProfile);
    });

    await test.step('lists the rules using the profile', async () => {
      for (const rule of [
        testData.patternRule,
        testData.exactRule,
        testData.priorityExactRule,
        testData.priorityWildcardRule,
      ]) {
        await expect(searchBoost.row(searchBoost.profileRulesTable, rule)).toBeVisible();
      }
      await expect(
        searchBoost.row(searchBoost.profileRulesTable, testData.dataStreamsRule)
      ).toBeHidden();
    });

    await test.step('has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });
  });
});
