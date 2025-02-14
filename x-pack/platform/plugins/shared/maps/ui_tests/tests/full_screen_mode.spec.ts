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

test.describe(
  'Maps',
  {
    tag: tags.DEPLOYMENT_AGNOSTIC,
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.maps.gotoNewMap();
      await pageObjects.renderable.waitForRender();
    });

    test('Full screen mode', async ({ page }) => {
      const fullScreenBtn = page.getByTestId(FULL_SCREEN_MODE);
      const exitFullScreenBtn = page.getByTestId(EXIT_FULL_SCREEN);
      const visibleChrome = page.getByTestId(VISIBLE_CHROME);
      const hiddenChrome = page.getByTestId(HIDDEN_CHROME);
      const baseMapBtn = page.getByRole('button', { name: 'Basemap' });

      await expect(fullScreenBtn).toBeVisible();
      await expect(exitFullScreenBtn).toBeHidden();
      await expect(visibleChrome).toBeVisible();
      await expect(hiddenChrome).toBeHidden();
      await expect(baseMapBtn).toBeVisible();

      await fullScreenBtn.click();

      await expect(fullScreenBtn).toBeHidden();
      await expect(exitFullScreenBtn).toBeVisible();
      await expect(visibleChrome).toBeHidden();
      await expect(hiddenChrome).toBeVisible();
      await expect(baseMapBtn).toBeVisible();

      await exitFullScreenBtn.click();

      await expect(fullScreenBtn).toBeVisible();
    });
  }
);
