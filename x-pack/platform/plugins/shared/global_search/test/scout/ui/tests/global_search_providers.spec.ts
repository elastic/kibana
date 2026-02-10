/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { KBN_ARCHIVES } from '../fixtures/constants';

/**
 * IMPORTANT: These tests only work in 'classic' navigation mode. Once https://github.com/elastic/kibana/pull/251436 is merged, we might need to revisit this and make them work in 'solution' navigation as well.
 */
test.describe('GlobalSearch providers', { tag: tags.ESS_ONLY }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.globalSearch.navigateToHome();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('SavedObject provider - can search for data views', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:index-pattern logstash');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('logstash-*');
  });

  test('SavedObject provider - can search for visualizations', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:visualization pie');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('A Pie');
  });

  test('SavedObject provider - can search for maps', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:map just');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('just a map');
  });

  test('SavedObject provider - can search for dashboards', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:dashboard Amazing');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Amazing Dashboard');
  });

  test('SavedObject provider - returns all objects matching the search', async ({
    pageObjects,
  }) => {
    await pageObjects.globalSearch.searchFor('type:dashboard dashboard');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(2);
    const labels = results.map((r) => r.label);
    expect(labels).toContain('dashboard with map');
    expect(labels).toContain('Amazing Dashboard');
  });

  test('SavedObject provider - can search by prefix', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:dashboard Amaz');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Amazing Dashboard');
  });

  test('Applications provider - can search for root-level applications', async ({
    pageObjects,
  }) => {
    await pageObjects.globalSearch.searchFor('discover');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results[0].label).toBe('Discover');
  });

  test('Applications provider - can search for application deep links', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('saved objects');

    const results = await pageObjects.globalSearch.getDisplayedResults();
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Kibana / Saved Objects');
  });
});
