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
  EXIT_FULL_SCREEN,
} from '../fixtures/constants';

test.describe('Maps', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.maps.goto();
    await pageObjects.maps.waitForRender();
  });

  test('Full screen mode', async ({ page }) => {
    const fullScreenBtn = page.testSubj.locator(FULL_SCREEN_MODE);
    const visibleChrome = page.testSubj.locator(VISIBLE_CHROME);
    const hiddenChrome = page.testSubj.locator(HIDDEN_CHROME);
    const exitFullScreenBtn = page.testSubj.locator(EXIT_FULL_SCREEN);
    const baseMapBtn = page.getByRole('button', { name: 'Basemap' });

    expect(fullScreenBtn);
    expect(baseMapBtn);
    expect(visibleChrome);
    await fullScreenBtn.click();
    expect(hiddenChrome);
    await expect(exitFullScreenBtn).toBeVisible();
    expect(fullScreenBtn).not.toBeVisible();
    await exitFullScreenBtn.click();
    expect(fullScreenBtn);
  });
});
