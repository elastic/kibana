/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CONNECTOR_NAME = `Scout HTTP QP Bug Test ${Date.now()}`;

test.describe(
  'HTTP connector secret query params bugs',
  { tag: tags.stateful.classic },
  () => {
    let connectorId: string;

    test.beforeAll(async ({ apiServices }) => {
      const connector = await apiServices.alerting.connectors.create({
        name: CONNECTOR_NAME,
        connectorTypeId: '.http',
        config: {
          url: 'https://httpbin.org',
          hasAuth: false,
        },
        secrets: {
          secretQueryParams: { apiKey: 'secret-value', token: 'secret-token' },
        },
      });
      connectorId = connector.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      if (connectorId) {
        await apiServices.alerting.connectors.delete(connectorId);
      }
    });

    test('Bug 1: toggle should be enabled when editing a connector with existing secret query params', async ({
      pageObjects,
    }) => {
      await pageObjects.connectorFlyout.gotoConnectorsList();
      await pageObjects.connectorFlyout.openEditConnectorFlyout(CONNECTOR_NAME);
      await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

      const toggle = pageObjects.connectorFlyout.queryParamsToggle;
      await expect(toggle).toBeVisible();

      const isChecked = await toggle.getAttribute('aria-checked');
      expect(isChecked).toBe('true');

      const keyInputs = pageObjects.connectorFlyout.queryParamKeyInputs;
      await expect(keyInputs).toHaveCount(2);
    });

    test('Bug 2: editing a query param value should not create a phantom param', async ({
      pageObjects,
    }) => {
      await pageObjects.connectorFlyout.gotoConnectorsList();
      await pageObjects.connectorFlyout.openEditConnectorFlyout(CONNECTOR_NAME);
      await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

      const keyInputs = pageObjects.connectorFlyout.queryParamKeyInputs;
      const initialCount = await keyInputs.count();

      const valueInputs = pageObjects.connectorFlyout.queryParamValueInputs;
      await valueInputs.first().click();
      await valueInputs.first().fill('new-secret-value');

      await pageObjects.connectorFlyout.page.waitForTimeout(1000);

      const countAfterEdit = await keyInputs.count();
      expect(countAfterEdit).toBe(initialCount);
    });

    test('Bug 3: clicking delete should remove the param, not reorder', async ({
      pageObjects,
    }) => {
      await pageObjects.connectorFlyout.gotoConnectorsList();
      await pageObjects.connectorFlyout.openEditConnectorFlyout(CONNECTOR_NAME);
      await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

      const keyInputs = pageObjects.connectorFlyout.queryParamKeyInputs;
      await expect(keyInputs).toHaveCount(2);

      const secondKeyValue = await keyInputs.nth(1).inputValue();

      const deleteButtons = pageObjects.connectorFlyout.queryParamDeleteButtons;
      await deleteButtons.first().click();

      await expect(keyInputs).toHaveCount(1);

      const remainingKeyValue = await keyInputs.first().inputValue();
      expect(remainingKeyValue).toBe(secondKeyValue);
    });
  }
);
