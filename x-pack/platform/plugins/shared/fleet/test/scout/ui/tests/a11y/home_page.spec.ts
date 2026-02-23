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
  createAgentPolicy,
  deleteAgentPolicy,
  cleanupAgentPolicies,
  setupFleetServer,
  unenrollAgents,
  mockFleetSetupEndpoints,
} from '../../common/api_helpers';
import {
  AGENT_FLYOUT,
  FLEET_SERVER_SETUP,
  GENERATE_FLEET_SERVER_POLICY_BUTTON,
  PLATFORM_TYPE_LINUX_BUTTON,
  ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON,
  ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON,
  AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  ENROLLMENT_TOKENS,
  UNINSTALL_TOKENS,
  DATA_STREAMS_TAB,
} from '../../common/selectors';

test.describe('Home page A11y', { tag: [...tags.stateful.classic] }, () => {
  let policyIdA11y: string;

  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    try {
      await unenrollAgents(kbnClient);
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore cleanup
    }
  });

  test('Agents - Get started with fleet', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
    await pageObjects.fleetHome.getAddFleetServerHeader().click();
    await page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });

    await expect(page.locator('main')).toBeVisible();
  });

  test('Agents - Install Fleet Server', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
    await pageObjects.fleetHome.getAddFleetServerHeader().click();
    await page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.testSubj.locator(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
    await page.testSubj.locator(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
    await page.testSubj.locator(FLEET_SERVER_SETUP.NAME_INPUT).fill('Host edited');
    const hostInput = page.testSubj
      .locator(FLEET_SERVER_SETUP.HOST_INPUT)
      .getByPlaceholder('Specify host URL');
    await expect(hostInput).toBeVisible({ timeout: 15_000 });
    await hostInput.fill('https://localhost:8220');
    await page.testSubj.locator(GENERATE_FLEET_SERVER_POLICY_BUTTON).click();
    await page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON).scrollIntoViewIfNeeded();
    await expect(page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Advanced - Select policy for fleet', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
    await pageObjects.fleetHome.getAddFleetServerHeader().click();
    await page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();

    await expect(page.locator('main')).toBeVisible();
  });

  test('Advanced - Add your fleet server host', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
    await pageObjects.fleetHome.getAddFleetServerHeader().click();
    await page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();

    await page.testSubj.locator(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
    await page.testSubj.locator(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
    await page.testSubj.locator(FLEET_SERVER_SETUP.NAME_INPUT).fill('New host');
    await page.testSubj
      .locator(FLEET_SERVER_SETUP.HOST_INPUT)
      .getByPlaceholder('Specify host URL')
      .fill('https://localhost:8220');
    await page.testSubj.locator(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON).click();
  });

  test('Advanced - Generate service token', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
    await pageObjects.fleetHome.getAddFleetServerHeader().click();
    await page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();

    await page.testSubj.locator(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON).click();
    await page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON).scrollIntoViewIfNeeded();
    await expect(page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Agent Policies - Agent Table', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.navigateToAgentPoliciesTab();
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });

    await expect(page.testSubj.locator('agentPoliciesTable')).toBeVisible();
  });

  test('Agent Policies - Create Policy Flyout', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.navigateToAgentPoliciesTab();
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).fill('testName');
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.ADVANCED_OPTIONS_TOGGLE)
      .click();
    await page.testSubj
      .locator('defaultNamespaceHeader')
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  test('Agent Policies - Agent Table After Adding Another Agent', async ({ pageObjects, page }) => {
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.navigateToAgentPoliciesTab();
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
    await page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).fill('testName');
    await page.testSubj.locator(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
    await page.testSubj
      .locator('agentPoliciesTable')
      .getByRole('link', { name: /testName/ })
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  test('Enrollment Tokens - Table', async ({ page }) => {
    await page.goto('/app/fleet/enrollment-tokens');
    await page.testSubj
      .locator('tableHeaderCell_name_0')
      .waitFor({ state: 'visible', timeout: 15_000 });

    await expect(page.testSubj.locator('tableHeaderCell_name_0')).toBeVisible();
  });

  test('Enrollment Tokens - Create Token Modal', async ({ page }) => {
    await page.goto('/app/fleet/enrollment-tokens');
    await page.testSubj
      .locator('tableHeaderCell_name_0')
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
    await page.testSubj
      .locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD)
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  test('Uninstall Tokens - Table', async ({ kbnClient, page }) => {
    const policy = await createAgentPolicy(kbnClient, 'Agent policy for A11y test', {
      id: 'agent-policy-a11y',
    });
    policyIdA11y = policy.id as string;

    try {
      await page.goto('/app/fleet/uninstall-tokens');
      await page.testSubj.locator('fleet-uninstall-tokens-tab').click();

      await expect(
        page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).getByText(policyIdA11y)
      ).toBeVisible();
    } finally {
      try {
        await deleteAgentPolicy(kbnClient, 'agent-policy-a11y');
      } catch {
        // Ignore
      }
    }
  });

  test('Uninstall Tokens - Command Flyout', async ({ kbnClient, page }) => {
    await createAgentPolicy(kbnClient, 'Agent policy for A11y flyout test', {
      id: 'agent-policy-a11y-flyout',
    });

    try {
      await page.goto('/app/fleet/uninstall-tokens');
      await page.testSubj.locator('fleet-uninstall-tokens-tab').click();
      await page.testSubj
        .locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)
        .waitFor({ state: 'visible', timeout: 15_000 });

      await page.testSubj
        .locator(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON)
        .getByRole('button')
        .click();
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT)).toBeVisible();
    } finally {
      try {
        await deleteAgentPolicy(kbnClient, 'agent-policy-a11y-flyout');
      } catch {
        // Ignore
      }
    }
  });

  test('Data Streams - Empty Table', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator(DATA_STREAMS_TAB).waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(DATA_STREAMS_TAB).click();

    await expect(page.testSubj.locator('tableHeaderSortButton')).toBeVisible({ timeout: 15_000 });
  });

  test.skip('Settings - Form', async ({ page }) => {
    // A11y Violation https://github.com/elastic/kibana/issues/138474
    await page.gotoApp('fleet');
    await page.testSubj.locator('fleet-settings-tab').click();

    await expect(page.testSubj.locator('fleetServerHostHeader')).toBeVisible({ timeout: 15_000 });
  });
});
