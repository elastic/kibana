/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// The connector spec registers its actionType id with a leading dot
// (`.alienvault-otx`); the card's data-test-subj follows `${id}-card`.
const CONNECTOR_TYPE_ID = '.alienvault-otx';
// Unique-per-run name so retries / leaked connectors from earlier failed runs
// don't collide.
const CONNECTOR_NAME = `web-${Date.now()}`;

test.describe('Create connector from connector spec', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    // page.goto needs a fully-qualified URL on the first call; Scout's
    // Playwright config does not set `baseURL`. Build it via kbnUrl.get().
    await page.goto(kbnUrl.get('/app/management/insightsAndAlerting/triggersActionsConnectors'));
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test(`creates a spec-defined connector (${CONNECTOR_TYPE_ID})`, async ({ apiServices, page }) => {
    // The Connectors page renders two "Create connector" buttons: the
    // top-right toolbar button (always present once any connector exists or
    // not) and a centered empty-state button shown when there are zero
    // connectors. The toolbar button is consistently present, so click it
    // directly instead of doing a Locator.or() that would match both.
    await page.testSubj.click('createConnectorButton');

    await page.testSubj.click(`${CONNECTOR_TYPE_ID}-card`);
    await page.testSubj.locator('nameInput').fill(CONNECTOR_NAME);
    await page.testSubj.locator('generator-field-secrets-X-OTX-API-KEY').fill('fake-token');

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // EUI Toast header title carries `data-test-subj="euiToastHeader__title"`
    // (not a CSS class). Success toast carries `Created '<name>'`.
    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${CONNECTOR_NAME}'`
    );

    // Find the new connector via the API for cleanup. The toast confirms
    // creation succeeded server-side, so the find is purely for getting an id
    // that afterAll can delete.
    const allConnectors = (await apiServices.alerting.connectors.getAll()) as Array<{
      id: string;
      name: string;
    }>;
    const created = allConnectors.find((c) => c.name === CONNECTOR_NAME);
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });
});
