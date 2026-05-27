/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH } from '../fixtures';

const CONNECTOR_TYPE_ID = '.alienvault-otx';
const CONNECTOR_NAME = `web-${Date.now()}`;

test.describe('Create connector from connector spec', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('creates a spec-defined AlienVault OTX connector', async ({ apiServices, page }) => {
    await page.testSubj.click('createConnectorButton');

    await page.testSubj.click(`${CONNECTOR_TYPE_ID}-card`);
    await page.testSubj.locator('nameInput').fill(CONNECTOR_NAME);
    await page.testSubj.locator('generator-field-secrets-X-OTX-API-KEY').fill('fake-token');

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${CONNECTOR_NAME}'`
    );

    const allConnectors = (await apiServices.alerting.connectors.getAll()) as Array<{
      id: string;
      name: string;
    }>;
    const created = allConnectors.find((c) => c.name === CONNECTOR_NAME);
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });
});
