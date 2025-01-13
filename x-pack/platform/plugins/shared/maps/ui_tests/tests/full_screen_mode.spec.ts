/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags, test } from '@kbn/scout';

test.describe('Maps full screen mode', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  const visibleChrome = 'kbnAppWrapper visibleChrome';
  const hiddenChrome = 'kbnAppWrapper hiddenChrome';
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin(); // add layer button not there when logged in as viewer
    await pageObjects.maps.goto();
    await pageObjects.maps.waitForRenderCompletion();
  });
  test('Full screen button should be visisble', async ({ page }) => {
    const sel = 'mapsFullScreenMode';
    await expect(
      page.testSubj.locator(sel),
      `Could not find the Full screen button, using selector ${sel}`
    ).toBeVisible();
  });
  test('full screen mode hides the kbn app wrapper', async ({ page }) => {
    expect(await page.testSubj.locator(visibleChrome).waitFor({ state: 'visible' }));
    await page.testSubj.click('mapsFullScreenMode');
    expect(await page.testSubj.locator(hiddenChrome).waitFor({ state: 'visible' }));
  });
  test('layer control is visible', async ({ page }) => {
    expect(await page.testSubj.locator('addLayerButton').waitFor({ state: 'visible' }));
  });
  test('displays exit full screen logo button', async ({ page }) => {
    await page.testSubj.click('mapsFullScreenMode');
    const sel = 'exitFullScreenModeButton';
    await expect(
      page.testSubj.locator(sel),
      `Could not find the exit full screen button, using selector ${sel}`
    ).toBeVisible();
  });
});
