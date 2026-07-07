/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';
import { mockNoShardsProfileResponse } from '../fixtures/mocks';

const INDEX_NAME = 'search_profiler_json_parse_index';

test.describe('Search Profiler JSON parsing', { tag: testData.SEARCH_PROFILER_TAGS }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          message: { type: 'text' },
        },
      },
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsSearchProfilerUser();
    await pageObjects.searchProfiler.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }).catch(() => {});
  });

  test('accepts triple-quoted strings in profile query JSON', async ({ pageObjects }) => {
    await pageObjects.searchProfiler.setQuery(`{
  "query": {
    "query_string": {
      "query": """*"""
    }
  }
}`);

    await pageObjects.searchProfiler.profile();
    await expect(pageObjects.searchProfiler.jsonParseErrorToast).toBeHidden();
  });

  test('shows a parse error for malformed triple-quoted JSON', async ({ pageObjects }) => {
    await pageObjects.searchProfiler.setQuery(`{
  "query": {
    "query_string": {
      "query": """*"
    }
  }
}`);

    await pageObjects.searchProfiler.profile();
    await expect(pageObjects.searchProfiler.jsonParseErrorToast).toBeVisible();
  });

  test('uses a no-shards notification when the selected index does not match shards', async ({
    page,
    pageObjects,
  }) => {
    await mockNoShardsProfileResponse(page);
    await pageObjects.searchProfiler.setIndex('search-profiler-missing-index-*');
    await pageObjects.searchProfiler.setQuery(testData.SIMPLE_QUERY);

    await pageObjects.searchProfiler.profile();
    await expect(pageObjects.searchProfiler.noShardsNotification).toBeVisible();
  });
});
