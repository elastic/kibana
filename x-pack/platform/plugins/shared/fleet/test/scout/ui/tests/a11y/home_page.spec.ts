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
  setFleetServerHost,
  unenrollAgents,
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
  test.beforeAll(async ({ kbnClient }) => {
    await setFleetServerHost(kbnClient, 'https://fleetserver:8220');
  });

  test.beforeEach(async ({ browserAuth }) => {
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

  test.describe('Agents', () => {
    test.beforeEach(async ({ pageObjects, page }) => {
      await pageObjects.fleetHome.navigateTo();
      await pageObjects.fleetHome.waitForPageToLoad();
      await pageObjects.fleetHome.getAddFleetServerHeader().click();
      await page.testSubj.locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON).waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('Get started with fleet', async ({ page }) => {
      await expect(page.locator('main')).toBeVisible();
    });

    test('Install Fleet Server', async ({ page }) => {
      await page.testSubj.locator(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
      await page.testSubj.locator(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
      await page.testSubj.locator(FLEET_SERVER_SETUP.NAME_INPUT).fill('Host edited');
      const hostInput = page.locator('[placeholder="Specify host URL"]').first();
      await expect(hostInput).toBeVisible({ timeout: 15_000 });
      await hostInput.fill('https://localhost:8220');
      await page.testSubj.locator(GENERATE_FLEET_SERVER_POLICY_BUTTON).click();
      await page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON).scrollIntoViewIfNeeded();
      await expect(page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON)).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Advanced', () => {
    test.beforeEach(async ({ pageObjects, page }) => {
      await pageObjects.fleetHome.navigateTo();
      await pageObjects.fleetHome.waitForPageToLoad();
      await pageObjects.fleetHome.getAddFleetServerHeader().click();
      await page.testSubj.locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON).waitFor({ state: 'visible', timeout: 15_000 });
      await page.testSubj.locator(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();
    });

    test('Select policy for fleet', async ({ page }) => {
      await expect(page.locator('main')).toBeVisible();
    });

    test('Add your fleet sever host', async ({ page }) => {
      await page.testSubj.locator(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
      await page.testSubj.locator(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
      await page.testSubj.locator(FLEET_SERVER_SETUP.NAME_INPUT).fill('New host');
      await page.locator('[placeholder="Specify host URL"]').first().fill('https://localhost:8220');
      await page.testSubj.locator(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON).click();
    });

    test('Generate service token', async ({ page }) => {
      await page.testSubj.locator(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON).click();
      await page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON).scrollIntoViewIfNeeded();
      await expect(page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON)).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Agent Policies', () => {
    test.beforeEach(async ({ pageObjects, page }) => {
      await pageObjects.fleetHome.navigateTo();
      await pageObjects.fleetHome.navigateToAgentPoliciesTab();
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('Agent Table', async ({ page }) => {
      await expect(page.testSubj.locator('agentPoliciesTable')).toBeVisible();
    });

    test('Create Policy Flyout', async ({ page }) => {
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE).waitFor({ state: 'visible', timeout: 15_000 });
      await page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).fill('testName');
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.ADVANCED_OPTIONS_TOGGLE).click();
      await page.testSubj.locator('defaultNamespaceHeader').waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('Agent Table After Adding Another Agent', async ({ page }) => {
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
      await page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE).waitFor({ state: 'visible', timeout: 15_000 });
      await page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).fill('testName');
      await page.testSubj.locator(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
      await page.getByRole('link', { name: /testName/ }).first().waitFor({ state: 'visible', timeout: 15_000 });
    });
  });

  test.describe('Enrollment Tokens', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/fleet/enrollment-tokens');
      await page.testSubj.locator('tableHeaderCell_name_0').waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('Enrollment Tokens Table', async ({ page }) => {
      await expect(page.testSubj.locator('tableHeaderCell_name_0')).toBeVisible();
    });

    test('Create Enrollment Token Modal', async ({ page }) => {
      await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
      await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD).waitFor({ state: 'visible', timeout: 15_000 });
    });
  });

  test.describe('Uninstall Tokens', () => {
    test.beforeAll(async ({ kbnClient }) => {
      const policy = await createAgentPolicy(kbnClient, 'Agent policy for A11y test', { id: 'agent-policy-a11y' });
      policyIdA11y = policy.id;
    });

    test.afterAll(async ({ kbnClient }) => {
      try {
        await deleteAgentPolicy(kbnClient, 'agent-policy-a11y');
      } catch {
        // Ignore
      }
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/app/fleet/uninstall-tokens');
      await page.testSubj.locator('fleet-uninstall-tokens-tab').click();
    });

    test('Uninstall Tokens Table', async ({ page }) => {
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).first()).toBeVisible();
    });

    test('Uninstall Command Flyout', async ({ page }) => {
      await page.testSubj.locator(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON).first().click();
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT)).toBeVisible();
    });
  });

  test.describe('Data Streams', () => {
    test.beforeEach(async ({ page }) => {
      await page.gotoApp('fleet');
      await page.testSubj.locator(DATA_STREAMS_TAB).waitFor({ state: 'visible', timeout: 15_000 });
      await page.testSubj.locator(DATA_STREAMS_TAB).click();
    });

    test('Datastreams Empty Table', async ({ page }) => {
      await expect(page.testSubj.locator('tableHeaderSortButton')).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe.skip('Settings', () => {
    // A11y Violation https://github.com/elastic/kibana/issues/138474
    test.beforeEach(async ({ page }) => {
      await page.gotoApp('fleet');
      await page.testSubj.locator('fleet-settings-tab').click();
    });

    test('Settings Form', async ({ page }) => {
      await expect(page.testSubj.locator('fleetServerHostHeader')).toBeVisible({ timeout: 15_000 });
    });
  });
});
