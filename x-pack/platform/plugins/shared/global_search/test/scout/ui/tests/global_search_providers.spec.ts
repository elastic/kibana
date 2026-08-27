/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { KBN_ARCHIVES } from '../fixtures/constants';

/**
 * IMPORTANT: These tests only work in 'classic' navigation mode. Once https://github.com/elastic/kibana/pull/251436 is merged, we might need to revisit this and make them work in 'solution' navigation as well.
 */
// Runs in a dedicated space so the space-scoped global search can't see objects other suites write to the default space.
spaceTest.describe('GlobalSearch providers', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(KBN_ARCHIVES.BASIC);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.globalSearch.navigateToHome();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('SavedObject provider - can search for data views', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:index-pattern logstash');

    const { resultLabels } = pageObjects.globalSearch;
    await expect(resultLabels).toHaveText(['logstash-*']);
  });

  spaceTest('SavedObject provider - can search for visualizations', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:visualization pie');

    const { resultLabels } = pageObjects.globalSearch;
    await expect(resultLabels).toHaveText(['A Pie']);
  });

  spaceTest('SavedObject provider - can search for maps', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:map just');

    const { resultLabels } = pageObjects.globalSearch;
    await expect(resultLabels).toHaveText(['just a map']);
  });

  spaceTest('SavedObject provider - can search for dashboards', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:dashboard Amazing');

    const { resultLabels } = pageObjects.globalSearch;
    await expect(resultLabels).toHaveText(['Amazing Dashboard']);
  });

  spaceTest(
    'SavedObject provider - returns all objects matching the search',
    async ({ pageObjects }) => {
      await pageObjects.globalSearch.searchFor('type:dashboard dashboard');

      const { resultLabels } = pageObjects.globalSearch;
      await expect(resultLabels).toHaveCount(2);
      await expect(resultLabels.filter({ hasText: 'dashboard with map' })).toBeVisible();
      await expect(resultLabels.filter({ hasText: 'Amazing Dashboard' })).toBeVisible();
    }
  );

  spaceTest('SavedObject provider - can search by prefix', async ({ pageObjects }) => {
    await pageObjects.globalSearch.searchFor('type:dashboard Amaz');

    const { resultLabels } = pageObjects.globalSearch;
    await expect(resultLabels).toHaveText(['Amazing Dashboard']);
  });

  spaceTest(
    'Applications provider - can search for root-level applications',
    async ({ pageObjects }) => {
      await pageObjects.globalSearch.searchFor('discover');

      const { resultLabels } = pageObjects.globalSearch;
      await expect(resultLabels.filter({ hasText: /^Discover$/ })).toBeVisible();
    }
  );

  spaceTest(
    'Applications provider - can search for application deep links',
    async ({ pageObjects }) => {
      await pageObjects.globalSearch.searchFor('saved objects');

      const { resultLabels } = pageObjects.globalSearch;
      await expect(resultLabels.filter({ hasText: 'Kibana / Saved Objects' })).toBeVisible();
    }
  );
});
