/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

let connectorId: string;

// TODO: The agent creation page (/agents/new) currently renders "Unable to load page"
// in the Scout test environment due to a rendering error in the agent form component.
// These tests should be re-enabled once the agent form rendering issue is resolved.
test.describe.skip('Skills tab on agent configuration form', { tag: ['@ess'] }, () => {
  // Create a mock LLM connector so the Agent Builder app is accessible
  test.beforeAll(async ({ kbnClient }) => {
    const connectorResponse = await kbnClient.request({
      method: 'POST',
      path: '/api/actions/connector',
      body: {
        name: 'e2e-test-agent-form-llm',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: 'https://api.openai.com/v1/chat/completions',
        },
        secrets: {
          apiKey: 'test-api-key-not-real',
        },
      },
    });
    connectorId = (connectorResponse.data as { id: string }).id;
  });

  test.afterAll(async ({ kbnClient }) => {
    if (connectorId) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${connectorId}`,
        ignoreErrors: [404],
      });
    }
  });

  test('should display the Skills tab with the built-in skill toggle', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Navigate to the new agent form
    await page.gotoApp('agent_builder/agents/new');

    // Wait for the agent form page to load
    await page.testSubj.waitForSelector('agentFormPageTitle', {
      state: 'visible',
      timeout: 30_000,
    });

    // Find and click the Skills tab
    const skillsTab = page.getByRole('tab', { name: /skills/i });
    await expect(skillsTab).toBeVisible();
    await skillsTab.click();

    // The built-in data-exploration skill toggle should be visible
    const builtinToggle = page.testSubj.locator('agentFormSkillToggle-data-exploration');
    await expect(builtinToggle).toBeVisible({ timeout: 10_000 });
  });

  test('should allow toggling skills on and off', async ({ browserAuth, page }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Navigate to new agent form
    await page.gotoApp('agent_builder/agents/new');

    await page.testSubj.waitForSelector('agentFormPageTitle', {
      state: 'visible',
      timeout: 30_000,
    });

    // Click Skills tab
    const skillsTab = page.getByRole('tab', { name: /skills/i });
    await skillsTab.click();

    // Find the built-in skill toggle
    const skillToggle = page.testSubj.locator('agentFormSkillToggle-data-exploration');
    await expect(skillToggle).toBeVisible({ timeout: 10_000 });

    // Get initial state
    const initialState = await skillToggle.isChecked();

    // Toggle it
    await skillToggle.click();

    // Verify it changed state
    const newState = await skillToggle.isChecked();
    expect(newState).toBe(!initialState);
  });
});
