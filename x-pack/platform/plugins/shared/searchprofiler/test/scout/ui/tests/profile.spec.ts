/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const INDEX_NAME = 'search_profiler_scout_index';

test.describe('Search Profiler profile execution', { tag: testData.SEARCH_PROFILER_TAGS }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({
      index: INDEX_NAME,
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
});
