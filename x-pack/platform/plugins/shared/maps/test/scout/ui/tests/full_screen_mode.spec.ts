/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { VISIBLE_CHROME, HIDDEN_CHROME } from '../fixtures/constants';

test.describe(
  'Maps',
  {
    tag: tags.deploymentAgnostic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.maps.gotoNewMap();
      await pageObjects.maps.waitForRenderComplete();
    });

    test('Full screen mode', async ({ page, pageObjects }) => {
      const visibleChrome = page.getByTestId(VISIBLE_CHROME);
      const hiddenChrome = page.getByTestId(HIDDEN_CHROME);
      const baseMapBtn = page.getByRole('button', { name: 'Basemap' });

      await pageObjects.maps.revealFullScreenModeButton();
      await expect(pageObjects.maps.fullScreenModeButton).toBeVisible();
      await expect(pageObjects.maps.exitFullScreenButton).toBeHidden();
      await expect(visibleChrome).toBeVisible();
      await expect(hiddenChrome).toBeHidden();
      await expect(baseMapBtn).toBeVisible();

      await pageObjects.maps.clickFullScreenMode();

      await expect(pageObjects.maps.fullScreenModeButton).toBeHidden();
      await expect(pageObjects.maps.exitFullScreenButton).toBeVisible();
      await expect(visibleChrome).toBeHidden();
      await expect(hiddenChrome).toBeVisible();
      await expect(baseMapBtn).toBeVisible();

      await pageObjects.maps.exitFullScreenButton.click();

      await pageObjects.maps.revealFullScreenModeButton();
      await expect(pageObjects.maps.fullScreenModeButton).toBeVisible();
    });
  }
);
