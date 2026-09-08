/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  CONNECTORS_API,
  CONNECTORS_WITH_ONE,
  FLEET_PACKAGES_API,
  INTEGRATIONS_LIST_API,
} from '../fixtures/mock_data';

const INDICES_API = '**/api/index_management/indices**';

test.describe(
  'Automatic Import — accessibility — create data stream flyout',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await page.route(CONNECTORS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CONNECTORS_WITH_ONE),
        })
      );

      await page.route(INDICES_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      );

      await page.route(FLEET_PACKAGES_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
      );

      await page.route(INTEGRATIONS_LIST_API, (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          route.continue();
        }
      });

      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.integrationManagement.navigateToCreate();

      await pageObjects.integrationManagement
        .getIntegrationTitleInput()
        .fill('Test Integration Title');
      await pageObjects.integrationManagement
        .getIntegrationDescriptionInput()
        .fill('Test Integration Description');

      await pageObjects.integrationManagement.openCreateDataStreamFlyout();
      await expect(pageObjects.integrationManagement.getCreateDataStreamFlyout()).toBeVisible();
    });

    test('has no detectable a11y violations on load', async ({ page }) => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="createDataStreamFlyout"]'],
      });
      expect(violations).toStrictEqual([]);
    });

    test('has no detectable a11y violations with index source selected', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.integrationManagement.getLogsSourceIndexCard().click();
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="createDataStreamFlyout"]'],
      });
      expect(violations).toStrictEqual([]);
    });
  }
);
