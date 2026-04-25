/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';
// The connector spec registers its actionType id with a leading dot
// (`.alienvault-otx`); the card's data-test-subj follows `${id}-card`.
const CONNECTOR_TYPE_ID = '.alienvault-otx';
// Unique-per-run name so retries / leaked connectors from earlier failed runs
// don't collide.
const CONNECTOR_NAME = `web-${Date.now()}`;
const CONNECTOR_TOKEN = 'fake-token';

const CREATE_CONNECTOR_BUTTON = 'createConnectorButton';
const CONNECTOR_TYPE_CARD = `${CONNECTOR_TYPE_ID}-card`;
const NAME_INPUT = 'nameInput';
const TOKEN_INPUT = 'generator-field-secrets-X-OTX-API-KEY';
const SAVE_BUTTON = 'create-connector-flyout-save-btn';
// EUI Toast header title carries this data-test-subj (not a CSS class).
const TOAST_TITLE_SUBJ = 'euiToastHeader__title';

test.describe('Create connector from connector spec', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    // page.goto needs a fully-qualified URL on the first call; Scout's
    // Playwright config does not set `baseURL`. Build it via kbnUrl.get().
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test(`creates a spec-defined connector (${CONNECTOR_TYPE_ID})`, async ({
    apiServices,
    page,
  }) => {
    // The Connectors page renders two "Create connector" buttons: the
    // top-right toolbar button (always present once any connector exists or
    // not) and a centered empty-state button shown when there are zero
    // connectors. The toolbar button is consistently present, so click it
    // directly instead of doing a Locator.or() that would match both.
    await page.testSubj.click(CREATE_CONNECTOR_BUTTON);

    await page.testSubj.click(CONNECTOR_TYPE_CARD);
    await page.testSubj.locator(NAME_INPUT).fill(CONNECTOR_NAME);
    await page.testSubj.locator(TOKEN_INPUT).fill(CONNECTOR_TOKEN);

    const saveButton = page.testSubj.locator(SAVE_BUTTON);
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Success toast carries `Created '<name>'` as its title.
    await expect(page.testSubj.locator(TOAST_TITLE_SUBJ)).toContainText(
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
