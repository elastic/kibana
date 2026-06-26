/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Lens fields list - ad-hoc datasource', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_DEFAULT_TIME_RANGE.from,
        to: testData.LOGSTASH_DEFAULT_TIME_RANGE.to,
      }),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await pageObjects.visualize.clickVisType('lens');

    // Switch to ad-hoc data view with time field
    await page.testSubj.click('lns-dataView-switch-link');
    await page.testSubj.fill('indexPattern-switcher--input', '*stash*');
    await page.testSubj.click('explore-matching-indices-button');
    await expect(page.testSubj.locator('fieldListLoading')).toBeHidden({ timeout: 30_000 });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('should show all fields as available', async ({ pageObjects }) => {
    const { lensFieldsList } = pageObjects;
    await expect(lensFieldsList.availableFieldsCount).toHaveText('50');
  });

  spaceTest(
    'should show a histogram and top values popover for numeric field',
    async ({ pageObjects }) => {
      const { lensFieldsList } = pageObjects;
      const [fieldId] = await lensFieldsList.findFieldIdsByType('number');

      await lensFieldsList.clickField(fieldId);
      await expect(lensFieldsList.popoverTitle).toBeVisible();
      await expect(lensFieldsList.topValuesChart).toBeVisible();
      await expect(lensFieldsList.topValuesBuckets).toHaveCount(11);
      const otherBucket = await lensFieldsList.getLastTopValuesBucket();
      await expect(otherBucket).toHaveText('Other\n96.7%');

      await lensFieldsList.distributionButton.click();
      await expect(lensFieldsList.getPopoverChart()).toBeVisible();
    }
  );

  spaceTest('should show a top values popover for a keyword field', async ({ pageObjects }) => {
    const { lensFieldsList } = pageObjects;
    const [fieldId] = await lensFieldsList.findFieldIdsByType('keyword');

    await lensFieldsList.clickField(fieldId);
    await expect(lensFieldsList.popoverTitle).toBeVisible();
    await expect(lensFieldsList.topValuesChart).toBeVisible();
    await expect(lensFieldsList.topValuesBuckets).toHaveCount(11);
    const otherBucket = await lensFieldsList.getLastTopValuesBucket();
    await expect(otherBucket).toHaveText('Other\n99.9%');
    await expect(lensFieldsList.getPopoverChart()).toBeHidden();
  });

  spaceTest('should show a date histogram popover for a date field', async ({ pageObjects }) => {
    const { lensFieldsList } = pageObjects;
    const [fieldId] = await lensFieldsList.findFieldIdsByType('date');

    await lensFieldsList.clickField(fieldId);
    await expect(lensFieldsList.popoverTitle).toBeVisible();
    await expect(lensFieldsList.getPopoverChart()).toBeVisible();
    await expect(lensFieldsList.topValuesButton).toBeHidden();
  });

  spaceTest('should show examples for geo points field', async ({ pageObjects }) => {
    const { lensFieldsList } = pageObjects;
    const [fieldId] = await lensFieldsList.findFieldIdsByType('geo_point');

    await lensFieldsList.clickField(fieldId);
    await expect(lensFieldsList.topValuesChart).toBeVisible();
    await expect(lensFieldsList.topValuesBuckets).toHaveCount(11);
  });

  spaceTest(
    'should show stats for runtime fields and react to filter and time range changes',
    async ({ page, pageObjects }) => {
      const { lensFieldsList } = pageObjects;

      await spaceTest.step('verify numeric runtime field stats', async () => {
        await lensFieldsList.searchField('runtime');
        await expect(lensFieldsList.getFieldLocator('Records')).toBeHidden();
        await expect(lensFieldsList.getFieldLocator('runtime_number')).toBeVisible();
        const [fieldId] = await lensFieldsList.findFieldIdsByType('number');

        await lensFieldsList.clickField(fieldId);
        await expect(lensFieldsList.popoverTitle).toBeVisible();
        await expect(lensFieldsList.topValuesChart).toBeVisible();
        await expect(lensFieldsList.topValuesBuckets).toHaveCount(11);
        const otherBucket = await lensFieldsList.getLastTopValuesBucket();
        await expect(otherBucket).toHaveText('Other\n96.7%');
        await lensFieldsList.distributionButton.click();
        await expect(lensFieldsList.getPopoverChart()).toBeVisible();
      });

      await spaceTest.step('verify keyword runtime field stats', async () => {
        await lensFieldsList.searchField('runtime');
        await expect(lensFieldsList.getFieldLocator('runtime_string')).toBeVisible();
        const [fieldId] = await lensFieldsList.findFieldIdsByType('keyword');

        await lensFieldsList.clickField(fieldId);
        await expect(lensFieldsList.popoverTitle).toBeVisible();
        await expect(lensFieldsList.topValuesChart).toBeVisible();
        await expect(lensFieldsList.getPopoverChart()).toBeHidden();
        await lensFieldsList.searchField('');
      });

      await spaceTest.step('verify filter changes popover content', async () => {
        const [fieldId] = await lensFieldsList.findFieldIdsByType('keyword');
        await lensFieldsList.clickField(fieldId);
        const initialCount = await lensFieldsList.getStatsFooterRecordCount();

        await pageObjects.filterBar.addFilter({
          field: 'geo.src',
          operator: 'is',
          value: 'CN',
        });

        await expect
          .poll(async () => {
            await lensFieldsList.clickField(fieldId);
            return lensFieldsList.getStatsFooterRecordCount();
          })
          .toBeLessThan(initialCount);
      });

      await spaceTest.step('verify excluded filter shows no data', async () => {
        await page.testSubj.click('queryBarMenu');
        await page.testSubj.click('filter-sets-removeAllFilters');
        await pageObjects.filterBar.addFilter({
          field: 'bytes',
          operator: 'is',
          value: '-1',
        });

        const [fieldId] = await lensFieldsList.findFieldIdsByType('keyword');
        await expect
          .poll(async () => {
            await lensFieldsList.clickField(fieldId);
            return lensFieldsList.missingFieldStats.isVisible();
          })
          .toBe(true);
      });

      await spaceTest.step('verify time range affects field availability', async () => {
        await page.testSubj.click('queryBarMenu');
        await page.testSubj.click('filter-sets-removeAllFilters');
        await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_OUT_OF_RANGE);
        await expect(lensFieldsList.emptyFieldsCount).toHaveText('52');
        await expect(lensFieldsList.availableFieldsCount).toHaveText('1');
      });
    }
  );
});
