/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const INDEX_NAME = 'search_profiler_scout_index';
const QUERY_WITH_AGGREGATION = JSON.stringify({
  query: { match: { message: 'hello' } },
  aggs: { all_messages: { filter: { match_all: {} } } },
});

// The shard details flyout renders in an EUI portal outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Search Profiler profile execution', { tag: testData.SEARCH_PROFILER_TAGS }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({
      index: INDEX_NAME,
      settings: { number_of_shards: 1 },
      mappings: {
        properties: {
          message: { type: 'text' },
        },
      },
    });
    await esClient.index({
      index: INDEX_NAME,
      document: {
        message: 'hello scout',
      },
      refresh: true,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsSearchProfilerUser();
    await pageObjects.searchProfiler.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }).catch(() => {});
  });

  test('profiles a simple query against a valid index', async ({ pageObjects }) => {
    await pageObjects.searchProfiler.setIndex(INDEX_NAME);
    await pageObjects.searchProfiler.setQuery(testData.SIMPLE_QUERY);

    await pageObjects.searchProfiler.profile();

    await expect(pageObjects.searchProfiler.profileTree).toBeVisible();
    await expect(pageObjects.searchProfiler.profileTree).toContainText(INDEX_NAME);
  });

  test('navigates the profile results without a11y violations', async ({ page, pageObjects }) => {
    const { searchProfiler } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('editor with a query', async () => {
      await searchProfiler.setIndex(INDEX_NAME);
      await searchProfiler.setQuery(QUERY_WITH_AGGREGATION);
      await expectNoA11yViolations();
    });

    await test.step('profile results', async () => {
      await searchProfiler.profile();
      await expect(searchProfiler.profileTree).toBeVisible();
      await expectNoA11yViolations();
    });

    await test.step('shard details flyout', async () => {
      await searchProfiler.viewShardDetailsLink.click();
      await expect(searchProfiler.shardDetailsFlyoutCloseButton).toBeVisible();
      await expectNoA11yViolations();

      await searchProfiler.shardDetailsFlyoutCloseButton.click();
      await expect(searchProfiler.shardDetailsFlyoutCloseButton).toBeHidden();
      await expectNoA11yViolations();
    });

    await test.step('expanded shard details', async () => {
      await searchProfiler.openCloseShardDetailsLink.click();
      await expectNoA11yViolations();
    });

    await test.step('aggregation profile tab', async () => {
      await searchProfiler.aggregationProfileTab.click();
      await expectNoA11yViolations();
    });
  });
});
