/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

let connectorId: string;

test.describe('Skills list page', { tag: ['@ess'] }, () => {
  // Create a mock LLM connector so the Agent Builder app is accessible
  test.beforeAll(async ({ kbnClient }) => {
    const response = await kbnClient.request({
      method: 'POST',
      path: '/api/actions/connector',
      body: {
        name: 'e2e-test-llm-connector',
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
    connectorId = (response.data as { id: string }).id;
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

  test('should display the skills page with the built-in data-exploration skill', async ({
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage } = pageObjects;

    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();

    // Skills page should be visible
    await expect(skillsPage.getSkillsPageContainer()).toBeVisible();

    // Skills table should be visible with at least the built-in skill
    await expect(skillsPage.getSkillsTable()).toBeVisible();

    // The built-in data-exploration skill should be listed
    await skillsPage.expectSkillRowVisible('data-exploration');

    // New skill button should be visible for privileged users
    await expect(skillsPage.getNewSkillButton()).toBeVisible();
  });

  test('should have a search input for filtering skills', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage } = pageObjects;

    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();

    // Search input should be visible
    await expect(skillsPage.getSearchInput()).toBeVisible();

    // Search for a non-existent skill - table should still be visible
    await skillsPage.searchForSkill('zzz_nonexistent_skill_xyz');

    // Clear search to reset
    await skillsPage.clearSearch();

    // Table should still be visible
    await expect(skillsPage.getSkillsTable()).toBeVisible();
  });

  test('should navigate to create skill form when clicking "New skill" button', async ({
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage, skillFormPage } = pageObjects;

    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();

    await skillsPage.clickNewSkillButton();
    await skillFormPage.waitForPageToLoad();

    // Should show the create skill form
    await expect(skillFormPage.getFormPage()).toBeVisible();
    await expect(skillFormPage.getIdInput()).toBeVisible();
    await expect(skillFormPage.getNameInput()).toBeVisible();
    await expect(skillFormPage.getDescriptionInput()).toBeVisible();
    await expect(skillFormPage.getContentInput()).toBeVisible();
  });
});
