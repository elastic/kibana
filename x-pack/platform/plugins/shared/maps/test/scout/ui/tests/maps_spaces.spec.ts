/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentListWrapper, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const NEW_MAP_TITLE = 'my test map';

test.describe('Maps - spaces feature controls', { tag: '@local-stateful-classic' }, () => {
  const spaceIds: string[] = [];

  const createSpace = async (
    apiServices: {
      spaces: {
        create: (space: {
          id: string;
          name: string;
          disabledFeatures: string[];
        }) => Promise<unknown>;
      };
    },
    parallelIndex: number,
    disabledFeatures: string[]
  ) => {
    const spaceId = `maps-spaces-${parallelIndex}-${Date.now()}`;
    await apiServices.spaces.create({ id: spaceId, name: spaceId, disabledFeatures });
    spaceIds.push(spaceId);
    return spaceId;
  };

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    await Promise.all(
      spaceIds.map(async (spaceId) => {
        await kbnClient.savedObjects.cleanStandardList({ space: spaceId });
        await apiServices.spaces.delete(spaceId);
      })
    );
  });

  test('space with no features disabled', async ({
    apiServices,
    kbnUrl,
    page,
    pageObjects,
  }, workerInfo) => {
    const { maps, collapsibleNav } = pageObjects;
    const space = await createSpace(apiServices, workerInfo.parallelIndex, []);

    await test.step('shows Maps navlink', async () => {
      // The home page redirects to the welcome screen in a space without data, so use the Maps app.
      await page.goto(kbnUrl.app('maps/map', { space }));
      await maps.waitForLayersToLoad();
      expect(await collapsibleNav.getNavLinks()).toContain('Maps');
    });

    await test.step('allows a map to be created', async () => {
      await maps.clickSaveButton();
      await maps.saveModal.selectNoDashboard();
      await maps.saveFromModal(NEW_MAP_TITLE, { redirectToOrigin: false });
      await maps.waitForLayersToLoad();
    });

    await test.step('allows a map to be deleted', async () => {
      const contentList = new ContentListWrapper(page);
      await page.goto(kbnUrl.app('maps', { space }));
      await expect(page.testSubj.locator('mapLandingPage')).toBeVisible();
      await contentList.searchFor(`"${NEW_MAP_TITLE}"`);
      await expect(contentList.itemLinks).toHaveCount(1);
      await contentList.selectAllAndDelete();
      await expect(contentList.itemLinks).toHaveCount(0);
    });
  });

  test('space with Maps disabled returns a 404', async ({
    apiServices,
    kbnUrl,
    page,
  }, workerInfo) => {
    const space = await createSpace(apiServices, workerInfo.parallelIndex, ['maps']);

    const response = await page.goto(kbnUrl.app('maps', { space }));
    expect(response?.status()).toBe(404);
    expect(await response?.json()).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });
});
