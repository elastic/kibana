/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Lens fields list - update field list', { tag: tags.stateful.classic }, () => {
  let testIndexName: string;

  spaceTest.beforeAll(async ({ scoutSpace, esClient }) => {
    testIndexName = `field-update-test-${scoutSpace.id}`;

    await esClient.index({
      index: testIndexName,
      document: {
        '@timestamp': new Date().toISOString(),
        oldField: 10,
      },
    });

    await scoutSpace.uiSettings.set({
      'dateFormat:tz': 'UTC',
    });
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    await esClient.indices.delete({ index: testIndexName, ignore_unavailable: true });
    await scoutSpace.uiSettings.unset('dateFormat:tz');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should show new fields in available fields after indexing',
    async ({ browserAuth, page, pageObjects, esClient }) => {
      const { lensFieldsList } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.visualize.goto();
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickVisType('lens');
      await pageObjects.datePicker.setCommonlyUsedTime('This_week');

      // Switch to ad-hoc data view for the test index
      await page.testSubj.click('lns-dataView-switch-link');
      await page.testSubj.fill('indexPattern-switcher--input', testIndexName);
      await page.testSubj.click('explore-matching-indices-button');
      await expect(page.testSubj.locator('fieldListLoading')).toBeHidden({ timeout: 30_000 });

      await expect(lensFieldsList.getFieldLocator('oldField')).toBeVisible();

      // Index a new document with an additional field
      await esClient.index({
        index: testIndexName,
        document: {
          '@timestamp': new Date().toISOString(),
          oldField: 20,
          newField: 20,
        },
        refresh: true,
      });

      // Submit a query to trigger a refresh
      await page.testSubj.fill('queryInput', 'oldField: 20');
      await page.testSubj.click('querySubmitButton');

      await expect(lensFieldsList.getFieldLocator('newField')).toBeVisible();
    }
  );
});
