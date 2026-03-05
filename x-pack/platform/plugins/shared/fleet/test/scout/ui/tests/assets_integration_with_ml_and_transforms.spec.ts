/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { setupFleetServer, installTestPackage, uninstallTestPackage } from '../common/api_helpers';
import { ASSETS_PAGE } from '../common/selectors';

const LMD_PACKAGE = 'lmd';

test.describe(
  'Assets integration with ML and transforms',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ kbnClient, esClient }) => {
      await setupFleetServer(kbnClient, esClient);
      await installTestPackage(kbnClient, LMD_PACKAGE, 'latest');
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      try {
        await uninstallTestPackage(kbnClient, LMD_PACKAGE);
      } catch {
        // Ignore
      }
    });

    test('should display integration assets including ML and transforms', async ({ page }) => {
      await page.goto(`/app/integrations/detail/${LMD_PACKAGE}/overview`);
      await page.testSubj.locator(ASSETS_PAGE.TAB).click();
      await expect(page.testSubj.locator(ASSETS_PAGE.getButtonId('index_templates'))).toBeVisible({
        timeout: 15_000,
      });
    });
  }
);
