/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */
import { expect } from '@kbn/scout/ui';
import type { ScoutPage, KibanaUrl } from '@kbn/scout';
import { waitForPageReady } from './constants';

const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';
const ENDPOINT_RESPONSE_ACTION_ADD_BUTTON = 'Elastic Defend-response-action-type-selection-option';

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
    throw new Error(
      'checkOsqueryResponseActionsPermissions must be called after navigating to a rule page'
    );
  }

  await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}/edit`));
  await waitForPageReady(page);

  // Wait for the rule to fully load
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 120_000 })
    .catch(() => {});

  // Wait for the Actions tab to be available (rule form fully rendered)
  const actionsTab = page.testSubj.locator('edit-rule-actions-tab');
  await actionsTab.waitFor({ state: 'visible', timeout: 30_000 });
  await actionsTab.click();

  // Wait for the response action button to be ready, then click it.
  // Retry if the accordion doesn't appear (page may not be fully loaded).
  const osqueryButton = page.testSubj.locator(OSQUERY_RESPONSE_ACTION_ADD_BUTTON);
  const actionAccordion = page.testSubj.locator('alertActionAccordion');
  for (let attempt = 0; attempt < 5; attempt++) {
    await osqueryButton.waitFor({ state: 'visible', timeout: 10_000 });
    await osqueryButton.click();
    if (
      await actionAccordion
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false)
    ) {
      break;
    }
  }

  if (enabled) {
    // Endpoint Complete: response actions should be available
    await page.testSubj.locator(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).click();
    await expect(page.getByText('Query is a required field').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Select an endpoint response action.').first()).toBeVisible({
      timeout: 15_000,
    });
  } else {
    // Other tiers: upgrade message should appear
    await expect(
      page
        .getByText('Upgrade your license to Endpoint Complete to use Osquery Response Actions.')
        .first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.testSubj.locator(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON)).toBeDisabled();
  }
}
