/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';

// The save modal's new/existing saved object and new/existing dashboard matrix is covered by
// Lens' add_to_dashboard Scout specs. These smoke tests only verify the map embeddable.
test.describe('Maps - add to dashboard save flow', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.maps.gotoNewMap();
    await pageObjects.maps.waitForLayersToLoad();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('new map saved by value to a new dashboard', async ({ pageObjects }) => {
    const { maps, dashboard } = pageObjects;
    const { saveModal } = maps;

    await maps.clickSaveButton();
    await saveModal.fillTitle('map by value');
    await saveModal.selectNewDashboard();
    await saveModal.setAddToLibrary(false);
    await saveModal.confirm();

    await dashboard.waitForRenderComplete();
    await dashboard.expectPanelCount(1);
    await dashboard.expectNotLinkedToLibrary('map by value');
  });

  test('new map saved by reference to a new dashboard', async ({ pageObjects }) => {
    const { maps, dashboard } = pageObjects;
    const { saveModal } = maps;

    await maps.clickSaveButton();
    await saveModal.fillTitle('map by reference');
    await saveModal.selectNewDashboard();
    await saveModal.setAddToLibrary(true);
    await saveModal.confirm();

    await dashboard.waitForRenderComplete();
    await dashboard.expectPanelCount(1);
    await dashboard.expectLinkedToLibrary('map by reference');
  });
});
