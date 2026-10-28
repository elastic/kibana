/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { ContentListWrapper, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';

// Saved map ID from the kbn_archives/maps.json fixture
const DOCUMENT_EXAMPLE_ID = 'd2e73f40-e14a-11e8-a35a-370a8516603a'; // 'document example'

const NEW_MAP_TITLE = 'my test map';

const getRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

const MAPS_ALL_ROLE = getRole({ maps: ['all'] });
const MAPS_READ_ROLE = getRole({ maps: ['read'] });
const NO_MAPS_ROLE = getRole({ discover: ['all'] });

test.describe('Maps - security feature controls', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('global maps all privileges', async ({ browserAuth, page, pageObjects }) => {
    const { maps, collapsibleNav, home } = pageObjects;
    await browserAuth.loginWithCustomRole(MAPS_ALL_ROLE);

    await test.step('shows maps navlink', async () => {
      await home.goto();
      expect(await collapsibleNav.getNavLinks()).toContain('Maps');
    });

    await test.step('allows a map to be created', async () => {
      await maps.gotoNewMap();
      await expect(maps.addLayerButton).toBeVisible();
      await maps.clickSaveButton();
      await maps.saveFromModal(NEW_MAP_TITLE, { redirectToOrigin: false });
      await maps.waitForLayersToLoad();
    });

    await test.step('allows a map to be deleted', async () => {
      const contentList = new ContentListWrapper(page);
      await page.gotoApp('maps');
      await expect(page.testSubj.locator('mapLandingPage')).toBeVisible();
      await contentList.searchFor(`"${NEW_MAP_TITLE}"`);
      await expect(contentList.itemLinks).toHaveCount(1);
      await contentList.selectAllAndDelete();
      await expect(contentList.itemLinks).toHaveCount(0);
    });

    await test.step("doesn't show read-only badge", async () => {
      await expect(pageObjects.chrome.badgeWithLabel('Read only')).toHaveCount(0);
    });
  });

  test('global maps read-only privileges', async ({ browserAuth, page, pageObjects }) => {
    const { maps, collapsibleNav, home, chrome } = pageObjects;
    await browserAuth.loginWithCustomRole(MAPS_READ_ROLE);

    await test.step('shows Maps navlink', async () => {
      await home.goto();
      expect(await collapsibleNav.getNavLinks()).toContain('Maps');
    });

    await test.step('listing page is read-only', async () => {
      const contentList = new ContentListWrapper(page);
      await page.gotoApp('maps');
      await expect(page.testSubj.locator('mapLandingPage')).toBeVisible();
      await expect(contentList.itemLinks).not.toHaveCount(0);
      await expect(page.testSubj.locator('newItemButton')).toBeHidden();
      await expect(contentList.tableSelectAllCheckbox).toBeHidden();
      await expect(chrome.badgeWithLabel('Read only')).not.toHaveCount(0);
    });

    await test.step("existing map can't be saved or have layers added", async () => {
      await maps.openMapWithId(DOCUMENT_EXAMPLE_ID);
      await expect(maps.saveButton).toBeHidden();
      await expect(maps.addLayerButton).toBeHidden();
    });
  });

  test('no maps privileges', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginWithCustomRole(NO_MAPS_ROLE);

    await test.step('does not show Maps navlink', async () => {
      await pageObjects.home.goto();
      expect(await pageObjects.collapsibleNav.getNavLinks()).not.toContain('Maps');
    });

    await test.step('returns a 403', async () => {
      await page.gotoApp('maps');
      await expect(
        page.getByText('You do not have permission to access the requested page')
      ).toBeVisible();
    });
  });
});
