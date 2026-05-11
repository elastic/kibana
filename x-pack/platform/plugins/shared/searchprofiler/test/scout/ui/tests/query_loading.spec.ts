/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { SEARCH_PROFILER_TAGS, SEARCH_PROFILER_USER_ROLE } from '../fixtures/constants';

const INDEX_NAME = 'test';
const PRECONFIGURED_QUERY = JSON.stringify(
  {
    query: {
      bool: {
        must: [{ match_all: {} }],
      },
    },
  },
  null,
  2
);

test.describe('Search Profiler query loading', { tag: SEARCH_PROFILER_TAGS }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SEARCH_PROFILER_USER_ROLE);
  });

  test('loads index and query from URL parameters', async ({ pageObjects }) => {
    await pageObjects.searchProfiler.goto({
      index: INDEX_NAME,
      loadFrom: PRECONFIGURED_QUERY,
    });

    await expect(pageObjects.searchProfiler.indexInput).toHaveValue(INDEX_NAME);
    await expect.poll(() => pageObjects.searchProfiler.getQuery()).toBe(PRECONFIGURED_QUERY);
  });
});
