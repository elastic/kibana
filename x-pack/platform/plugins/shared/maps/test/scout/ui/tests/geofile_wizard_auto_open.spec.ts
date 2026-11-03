/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

test.describe(
  'Maps - auto open file upload wizard',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test('should open layer add panel when openLayerWizard URL param is set', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { maps } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await page.gotoApp('maps/map', { params: { openLayerWizard: 'uploadGeoFile' } });
      await maps.waitForLayersToLoad();

      await expect(maps.layerAddForm).toBeVisible({ timeout: 20_000 });
    });
  }
);
