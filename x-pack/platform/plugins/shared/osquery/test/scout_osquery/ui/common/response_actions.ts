/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { ScoutPage, KibanaUrl } from '@kbn/scout';
import { waitForPageReady } from './constants';

const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';
const ENDPOINT_RESPONSE_ACTION_ADD_BUTTON =
  'Elastic Defend-response-action-type-selection-option';

/**
 * Checks whether Osquery response actions are available or restricted
 * based on the product tier. This mirrors the Cypress
 * `checkOsqueryResponseActionsPermissions` function from
 * `cypress/tasks/response_actions.ts`.
 *
 * @param enabled - true if response actions should be available (Endpoint Complete tier),
 *                  false if they should show an upgrade message.
 */
export async function checkOsqueryResponseActionsPermissions(
  page: ScoutPage,
  kbnUrl: KibanaUrl,
  enabled: boolean
): Promise<void> {
  // Navigate to rule edit page — wait for two GET /api/detection_engine/rules calls
  // to complete (the UI updates only after the second).
  const ruleId = page.url().match(/rules\/id\/([^/]+)/)?.[1];
  if (!ruleId) {
    throw new Error('checkOsqueryResponseActionsPermissions must be called after navigating to a rule page');
  }

  await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}/edit`));
  await waitForPageReady(page);

  // Wait for the rule to fully load
  await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Close the date tab if visible (can overlap the Actions tab)
  const dateTab = page.getByText('Schedule').first();
  if (await dateTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Just ensure the Actions tab is clickable
  }

  // Click the Actions tab
  await page.testSubj.locator('edit-rule-actions-tab').click();
  await page.waitForTimeout(1000);

  // Click the Osquery response action add button.
  // In rare cases the button is not clickable due to the page not being fully loaded,
  // so we retry a few times.
  let actionAccordionVisible = false;
  for (let attempt = 0; attempt < 5 && !actionAccordionVisible; attempt++) {
    await page.testSubj.locator(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
    await page.waitForTimeout(2000);
    actionAccordionVisible = await page.testSubj
      .locator('alertActionAccordion')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
  }

  if (enabled) {
    // Endpoint Complete: response actions should be available
    await page.testSubj.locator(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).click();
    await expect(page.getByText('Query is a required field').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText('Select an endpoint response action.').first()
    ).toBeVisible({ timeout: 15_000 });
  } else {
    // Other tiers: upgrade message should appear
    await expect(
      page
        .getByText('Upgrade your license to Endpoint Complete to use Osquery Response Actions.')
        .first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.testSubj.locator(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON)
    ).toBeDisabled();
  }
}
