/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  SEARCH_PROFILER_TAGS,
  SEARCH_PROFILER_USER_ROLE,
  SIMPLE_QUERY,
} from '../fixtures/constants';

test.describe('Search Profiler JSON parsing', { tag: SEARCH_PROFILER_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(SEARCH_PROFILER_USER_ROLE);
    await pageObjects.searchProfiler.goto();
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
    pageObjects,
  }) => {
    await pageObjects.searchProfiler.setIndex('search-profiler-missing-index-*');
    await pageObjects.searchProfiler.setQuery(SIMPLE_QUERY);

    await pageObjects.searchProfiler.profile();
    await expect(pageObjects.searchProfiler.noShardsNotification).toBeVisible();
  });
});
