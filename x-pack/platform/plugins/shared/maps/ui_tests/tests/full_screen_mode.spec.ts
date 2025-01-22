/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags, test } from '@kbn/scout';
import {
  VISIBLE_CHROME,
  HIDDEN_CHROME,
  FULL_SCREEN_MODE,
  ADD_LAYER_BTN,
  EXIT_FULL_SCREEN,
} from '../fixtures/constants';

test.describe('Maps full screen mode', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser(); // add layer button not there when logged in as viewer
    await pageObjects.maps.goto();
    await pageObjects.maps.waitForRender();
  });

  test('Full screen button and layer control should be visisble', async ({ page }) => {
    const fullScreen = page.testSubj.locator(FULL_SCREEN_MODE);
    const addLayerBtn = page.testSubj.locator(ADD_LAYER_BTN);

    await expect(fullScreen).toBeVisible();
    expect(await addLayerBtn.waitFor());
  });
  test('full screen mode hides the kbn app wrapper', async ({ page }) => {
    const visibleChrome = page.testSubj.locator(VISIBLE_CHROME);
    const hiddenChrome = page.testSubj.locator(HIDDEN_CHROME);

    expect(await visibleChrome.waitFor());
    await page.testSubj.click(FULL_SCREEN_MODE);
    expect(await hiddenChrome.waitFor());
  });
  test('displays exit full screen logo button & exits when clicked', async ({ page }) => {
    const fullScreenBtn = page.testSubj.locator(FULL_SCREEN_MODE);
    const exitBtn = page.testSubj.locator(EXIT_FULL_SCREEN);
    const visibleChrome = page.testSubj.locator(VISIBLE_CHROME);

    await fullScreenBtn.click();
    await expect(exitBtn).toBeVisible();
    await expect(fullScreenBtn).not.toBeVisible();
    await exitBtn.click();
    expect(await visibleChrome.waitFor());
    await expect(fullScreenBtn).toBeVisible();
  });
});
