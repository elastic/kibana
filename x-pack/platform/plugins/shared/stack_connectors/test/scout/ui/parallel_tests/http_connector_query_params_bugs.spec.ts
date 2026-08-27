/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CONNECTOR_NAME = `ScoutQP${Date.now()}`;

test.describe('HTTP connector secret query params bugs', { tag: tags.stateful.classic }, () => {
  let connectorId: string;

  test.beforeAll(async ({ apiServices }) => {
    const connector = await apiServices.alerting.connectors.create({
      name: CONNECTOR_NAME,
      connectorTypeId: '.http',
      config: {
        url: 'https://httpbin.org',
        hasAuth: false,
        authType: null,
      },
      secrets: {
        secretQueryParams: { apiKey: 'secret-value', token: 'secret-token' },
        secretParams: { client_id: 'secret-id', client_secret: 'secret-value' },
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

  test('Bug 1: toggle should be enabled when editing, and clicking it OFF should disable query params', async ({
    pageObjects,
  }) => {
    await pageObjects.connectorFlyout.gotoConnectorsList();
    await pageObjects.connectorFlyout.openEditConnectorFlyout({
      id: connectorId,
      name: CONNECTOR_NAME,
    });
    await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

    const toggle = pageObjects.connectorFlyout.queryParamsToggle;
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await expect(pageObjects.connectorFlyout.queryParamKeyInputs).toHaveCount(2);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(pageObjects.connectorFlyout.queryParamKeyInputs).toHaveCount(0);
  });

  test('Bug 2: typing into a key field should edit in place, not create a new param', async ({
    pageObjects,
  }) => {
    await pageObjects.connectorFlyout.gotoConnectorsList();
    await pageObjects.connectorFlyout.openEditConnectorFlyout({
      id: connectorId,
      name: CONNECTOR_NAME,
    });
    await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

    const keyInputs = pageObjects.connectorFlyout.queryParamKeyInputs;
    await expect(keyInputs).toHaveCount(2);

    const firstKey = keyInputs.locator('nth=0');
    await firstKey.click();
    await firstKey.press('End');
    await firstKey.pressSequentially('xyz');

    await expect(keyInputs).toHaveCount(2);

    await expect(firstKey).toHaveValue(/xyz/);
  });

  test('Bug 3: clicking delete should remove the param, not reorder', async ({ pageObjects }) => {
    await pageObjects.connectorFlyout.gotoConnectorsList();
    await pageObjects.connectorFlyout.openEditConnectorFlyout({
      id: connectorId,
      name: CONNECTOR_NAME,
    });
    await pageObjects.connectorFlyout.waitForQueryParamsLoaded();

    const keyInputs = pageObjects.connectorFlyout.queryParamKeyInputs;
    await expect(keyInputs).toHaveCount(2);

    const secondKeyValue = await keyInputs.locator('nth=1').inputValue();

    const deleteButtons = pageObjects.connectorFlyout.queryParamDeleteButtons;
    await deleteButtons.locator('nth=0').click();

    await expect(keyInputs).toHaveCount(1);

    await expect(keyInputs.locator('nth=0')).toHaveValue(secondKeyValue);
  });

  test('secret parameters preserve toggle, edit, and delete behavior', async ({ pageObjects }) => {
    await pageObjects.connectorFlyout.gotoConnectorsList();
    await pageObjects.connectorFlyout.openEditConnectorFlyout({
      id: connectorId,
      name: CONNECTOR_NAME,
    });
    await pageObjects.connectorFlyout.waitForSecretParamsLoaded();

    const toggle = pageObjects.connectorFlyout.secretParamsToggle;
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    const keyInputs = pageObjects.connectorFlyout.secretParamKeyInputs;
    await expect(keyInputs).toHaveCount(2);
    const firstKey = keyInputs.locator('nth=0');
    const firstKeyValue = await firstKey.inputValue();
    await firstKey.fill(`${firstKeyValue}_updated`);
    await expect(keyInputs).toHaveCount(2);
    await expect(firstKey).toHaveValue(`${firstKeyValue}_updated`);

    const secondKeyValue = await keyInputs.locator('nth=1').inputValue();
    await pageObjects.connectorFlyout.secretParamDeleteButtons.locator('nth=0').click();
    await expect(keyInputs).toHaveCount(1);
    await expect(keyInputs.locator('nth=0')).toHaveValue(secondKeyValue);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(keyInputs).toHaveCount(0);
  });
});
