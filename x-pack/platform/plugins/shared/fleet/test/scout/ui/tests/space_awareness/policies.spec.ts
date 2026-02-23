/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../../fixtures';
import {
  setupFleetServer,
  enableSpaceAwareness,
  createSpace,
  cleanupAgentPolicies,
  mockFleetSetupEndpoints,
} from '../../common/api_helpers';
import {
  ADD_AGENT_POLICY_BTN,
  AGENT_POLICIES_TABLE,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX,
  AGENT_POLICY_DETAILS_PAGE,
} from '../../common/selectors';

const POLICY_NAME = 'Policy 1 space test';
const NO_AGENT_POLICIES = 'No agent policies';

test.describe('Space aware policies creation', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
    await enableSpaceAwareness(kbnClient);
    await createSpace(kbnClient, 'test', 'Test');
    await cleanupAgentPolicies(kbnClient);
    await cleanupAgentPolicies(kbnClient, 'test');
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsAdmin();
    await page.route('**/api/fleet/agent_policies**', (route) => route.continue());
    await page.route('**/internal/fleet/agent_policies_spaces**', (route) => route.continue());
  });

  test('should allow to create an agent policy in the test space', async ({ page }) => {
    await page.goto('/s/test/app/fleet/policies');
    await page.testSubj.locator(ADD_AGENT_POLICY_BTN).click();
    await page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).fill(POLICY_NAME);
    await page.testSubj.locator(AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX).uncheck();
    await page.testSubj.locator(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
    await expect(page.testSubj.locator(AGENT_POLICIES_TABLE).getByText(POLICY_NAME)).toBeVisible();
  });

  test('the created policy should not be visible in the default space', async ({ page }) => {
    await page.goto('/app/fleet/policies');
    await expect(
      page.testSubj.locator(AGENT_POLICIES_TABLE).getByText(NO_AGENT_POLICIES)
    ).toBeVisible();
  });

  test('should allow to update that policy to belong to both test and default space', async ({
    page,
  }) => {
    await page.goto('/s/test/app/fleet/policies');
    await page.testSubj.locator(AGENT_POLICIES_TABLE).getByText(POLICY_NAME).click();
    await page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SETTINGS_TAB).click();
    await page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SPACE_SELECTOR_COMBOBOX).click();
    await page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SPACE_SELECTOR_COMBOBOX).fill('default');
    await page.keyboard.press('Enter');
    await page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SAVE_BUTTON).click();
  });

  test('the policy should be visible in the test space', async ({ page }) => {
    await page.goto('/s/test/app/fleet/policies');
    await expect(page.testSubj.locator(AGENT_POLICIES_TABLE).getByText(POLICY_NAME)).toBeVisible();
  });

  test('the policy should be visible in the default space', async ({ page }) => {
    await page.goto('/app/fleet/policies');
    await expect(page.testSubj.locator(AGENT_POLICIES_TABLE).getByText(POLICY_NAME)).toBeVisible();
  });
});
