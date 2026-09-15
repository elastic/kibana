/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SEARCH_SOLUTION_SPACE_ID = 'stack-alerts-search-nav';

test.describe(
  'Stack Alerts visibility in Search project nav',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ apiServices, config }) => {
      if (config.serverless) {
        return;
      }
      await apiServices.spaces.delete(SEARCH_SOLUTION_SPACE_ID);
      await apiServices.spaces.create({
        id: SEARCH_SOLUTION_SPACE_ID,
        name: 'Stack Alerts Search Nav',
      });
      await apiServices.spaces.setSolutionView({
        id: SEARCH_SOLUTION_SPACE_ID,
        solution: 'es',
      });
    });

    test.afterAll(async ({ apiServices, config }) => {
      if (!config.serverless) {
        await apiServices.spaces.delete(SEARCH_SOLUTION_SPACE_ID);
      }
    });

    test('shows Stack Alerts under Alerts and Insights', async ({
      browserAuth,
      config,
      kbnUrl,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();

      if (config.serverless) {
        await page.gotoApp('searchHomepage');
      } else {
        await page.goto(kbnUrl.app('searchHomepage', { space: SEARCH_SOLUTION_SPACE_ID }));
      }

      const nav = pageObjects.projectManagementNav;
      await nav.waitForLoad();
      const panel = await nav.openManagementPanel();

      await expect(nav.managementLink(panel, 'triggersActions')).toBeVisible();
      await expect(nav.managementLink(panel, 'triggersActionsAlerts')).toBeVisible();
    });
  }
);
