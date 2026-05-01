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
  CONNECTORS_EMPTY_RESPONSE,
  FLEET_PACKAGES_API,
  INTEGRATIONS_LIST_API,
} from '../fixtures/mock_data';

test.describe(
  'Add Integration — Automatic Import V2 — Connector & Form',
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
    });

    // --- Connector Selector — connectors available ---

    test('shows the connector selector button when connectors are available', async ({
      pageObjects,
    }) => {
      await expect(pageObjects.integrationManagement.getConnectorSelector()).toBeVisible();
    });

    test('does not show the Add new connector button when connectors exist', async ({
      pageObjects,
    }) => {
      await expect(pageObjects.integrationManagement.getAddNewConnectorButton()).toBeHidden();
    });

    // --- Connector Selector — no connectors (override route then re-navigate) ---

    test('shows Add new connector button when no AI connectors are available', async ({
      page,
      pageObjects,
    }) => {
      await page.route(CONNECTORS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CONNECTORS_EMPTY_RESPONSE),
        })
      );
      await pageObjects.integrationManagement.navigateToCreate();
      await expect(pageObjects.integrationManagement.getAddNewConnectorButton()).toBeVisible();
    });

    test('opens the connector setup flyout when Add new connector is clicked', async ({
      page,
      pageObjects,
    }) => {
      await page.route(CONNECTORS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CONNECTORS_EMPTY_RESPONSE),
        })
      );
      await pageObjects.integrationManagement.navigateToCreate();
      await pageObjects.integrationManagement.getAddNewConnectorButton().click();
      await expect(pageObjects.integrationManagement.getConnectorSetupFlyout()).toBeVisible();
    });

    // --- Integration Details Form ---

    test('renders the title and description input fields', async ({ pageObjects }) => {
      await expect(pageObjects.integrationManagement.getIntegrationTitleInput()).toBeVisible();
      await expect(
        pageObjects.integrationManagement.getIntegrationDescriptionInput()
      ).toBeVisible();
    });

    test('allows entering an integration title and description', async ({ pageObjects }) => {
      await pageObjects.integrationManagement
        .getIntegrationTitleInput()
        .fill('My Custom Integration');
      await pageObjects.integrationManagement
        .getIntegrationDescriptionInput()
        .fill('Parses custom log format');
      await expect(pageObjects.integrationManagement.getIntegrationTitleInput()).toHaveValue(
        'My Custom Integration'
      );
      await expect(pageObjects.integrationManagement.getIntegrationDescriptionInput()).toHaveValue(
        'Parses custom log format'
      );
    });

    test('Done button is disabled when no data streams have been added', async ({
      pageObjects,
    }) => {
      await expect(pageObjects.integrationManagement.getDoneButton()).toBeDisabled();
    });

    test('Cancel button is visible', async ({ pageObjects }) => {
      await expect(pageObjects.integrationManagement.getCancelButton()).toBeVisible();
    });
  }
);
