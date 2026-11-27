/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';
const MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID = '19906970-2e40-11e9-85cb-6965aae20f13';

test.describe('Maps - save and return work flow', { tag: '@local-stateful-classic' }, () => {
  let prevDefaultIndex: string | number | boolean | undefined;

  test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
    prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await kbnClient.savedObjects.cleanStandardList();
    if (prevDefaultIndex !== undefined) {
      await uiSettings.set({ defaultIndex: prevDefaultIndex });
    } else {
      await uiSettings.unset('defaultIndex');
    }
  });

  const openNewMapFromDashboard = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.addMapPanel();
    await pageObjects.maps.waitForLayersToLoad();
  };

  const editJoinExampleMapFromDashboard = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.openDashboardWithIdInEditMode(MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID);
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', 'join example');
    await pageObjects.maps.waitForLayersToLoad();
  };

  test('new map: save should return to dashboard and add new map panel', async ({
    pageObjects,
  }) => {
    const { maps, dashboard } = pageObjects;

    await openNewMapFromDashboard(pageObjects);
    await maps.clickSaveButton();
    await maps.saveFromModal('map created from dashboard save and return', {
      redirectToOrigin: true,
    });

    await dashboard.waitForRenderComplete();
    await dashboard.expectPanelCount(1);
  });

  test('new map: save and uncheck return to origin switch should cut the originator and stay in maps application', async ({
    pageObjects,
  }) => {
    const { maps } = pageObjects;

    await openNewMapFromDashboard(pageObjects);

    await maps.clickSaveButton();
    await maps.saveFromModal('map created from dashboard save and return with originator app cut', {
      redirectToOrigin: false,
    });
    await maps.waitForLayersToLoad();
    await expect(maps.saveAndReturnButton).toBeHidden();
    await expect(maps.saveButton).toBeVisible();
  });

  test('edit existing map: save and return should return to dashboard', async ({ pageObjects }) => {
    const { maps, dashboard } = pageObjects;

    await editJoinExampleMapFromDashboard(pageObjects);

    await test.step('should use dashboard time instead of time stored in map state', async () => {
      // join example map's time is "last 17 minutes"; ensure map has dashboard time
      const timeConfig = await pageObjects.datePicker.getTimeConfig();
      expect(timeConfig.start).toBe('2015-09-20T00:00:00.000Z');
      expect(timeConfig.end).toBe('2015-09-20T01:00:00.000Z');
    });

    await test.step('clicking save and return should return to dashboard', async () => {
      await maps.saveAndReturnButton.click();
      await dashboard.waitForRenderComplete();
      await dashboard.expectPanelCount(2);
    });
  });

  test('edit existing map: save and return should lose its connection to the dashboard when creating new map', async ({
    page,
    pageObjects,
  }) => {
    const { maps } = pageObjects;

    await editJoinExampleMapFromDashboard(pageObjects);

    await page.gotoApp('maps');
    await page.testSubj.click('newItemButton');
    await maps.waitForLayersToLoad();
    await expect(maps.saveAndReturnButton).toBeHidden();

    await maps.clickSaveButton();
    await expect(maps.saveModal.modal).toBeVisible();
    await expect(maps.returnToOriginSwitch).toBeHidden();
  });

  test('edit existing map: save as should return to dashboard and add new panel', async ({
    page,
    pageObjects,
  }) => {
    const { maps, dashboard } = pageObjects;

    await editJoinExampleMapFromDashboard(pageObjects);
    await maps.clickSaveButton();
    await page.testSubj.locator('saveAsNewCheckbox').setChecked(true);
    await maps.saveFromModal('Clone of map embeddable example', { redirectToOrigin: true });

    await dashboard.waitForRenderComplete();
    await dashboard.expectPanelCount(3);
  });

  test('edit existing map: save as and uncheck return to origin switch should cut the originator and stay in maps application', async ({
    page,
    pageObjects,
  }) => {
    const { maps } = pageObjects;

    await editJoinExampleMapFromDashboard(pageObjects);

    await maps.clickSaveButton();
    await page.testSubj.locator('saveAsNewCheckbox').setChecked(true);
    await maps.saveFromModal('Clone 2 of map embeddable example', { redirectToOrigin: false });

    await maps.waitForLayersToLoad();
    await expect(maps.saveAndReturnButton).toBeHidden();
    await expect(maps.saveButton).toBeVisible();
  });
});
