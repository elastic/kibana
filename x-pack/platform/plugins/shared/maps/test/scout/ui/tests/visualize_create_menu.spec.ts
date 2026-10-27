/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';

const getRole = (mapsPrivilege?: 'all' | 'read'): KibanaRole => ({
  kibana: [
    {
      base: [],
      feature: {
        visualize: ['all'],
        ...(mapsPrivilege ? { maps: [mapsPrivilege] } : {}),
      },
      spaces: ['*'],
    },
  ],
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logstash*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
});

test.describe('Maps - visualize create menu', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    // Visualize redirects to the "no data" page unless a data view exists.
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('maps alias with write permission shows maps in create menu and opens Maps app', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getRole('all'));
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await expect(page.testSubj.locator('visType-maps')).toBeVisible();

    await pageObjects.visualize.clickVisType('maps');
    await pageObjects.maps.expectOnMapPage();
  });

  test('maps alias without write permission does not show maps in create menu', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getRole('read'));
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await expect(page.testSubj.locator('visType-vega')).toBeVisible();
    await expect(page.testSubj.locator('visType-maps')).toBeHidden();
  });

  test('edit meta-data: should allow to change meta-data on a map visualization', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { maps, visualize, listingTable } = pageObjects;

    await browserAuth.loginWithCustomRole(getRole('all'));
    await visualize.createMapVisualization();
    await maps.expectOnMapPage();
    await maps.clickSaveButton();
    await maps.saveFromModal('myTestMap', { redirectToOrigin: false });

    await visualize.goto();
    await listingTable.searchForItemTitle('myTestMap');
    // The table is already "loaded" before the search applies, so wait for the filter to narrow to one row.
    const inspectAction = page.testSubj.locator('inspect-action');
    await expect(inspectAction).toHaveCount(1);
    await inspectAction.click();
    await page.testSubj.fill('nameInput', 'AnotherTestMap');
    await page.testSubj.fill('descriptionInput', 'new description');
    await page.testSubj.click('saveButton');
    await expect(page.testSubj.locator('flyoutTitle')).toBeHidden();

    await listingTable.searchForItemTitle('AnotherTestMap');
    await expect(page.testSubj.locator('visListingTitleLink-AnotherTestMap')).toHaveCount(1);
  });
});
