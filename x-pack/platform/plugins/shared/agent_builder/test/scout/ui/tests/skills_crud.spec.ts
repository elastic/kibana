/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SKILL_ID_PREFIX = 'e2e-test-skill';
const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };

let connectorId: string;

test.describe('Skills CRUD - UI flows', { tag: ['@ess'] }, () => {
  let uniqueSkillId: string;

  // Create a mock LLM connector so the Agent Builder app is accessible
  test.beforeAll(async ({ kbnClient }) => {
    const response = await kbnClient.request({
      method: 'POST',
      path: '/api/actions/connector',
      body: {
        name: 'e2e-test-crud-llm-connector',
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

  test.beforeEach(() => {
    uniqueSkillId = `${SKILL_ID_PREFIX}-${Date.now()}`;
  });

  // Cleanup: delete test skills via API after each test
  test.afterEach(async ({ kbnClient }) => {
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/skills/${uniqueSkillId}`,
        headers: API_VERSION_HEADER,
      });
    } catch {
      // Skill may already be deleted or not created
    }
  });

  test('should create a new skill via the form', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage, skillFormPage } = pageObjects;

    // Navigate to create skill page
    await skillFormPage.navigateToCreate();
    await skillFormPage.waitForPageToLoad();
    await skillFormPage.waitForFormToLoad();

    // Fill in the form
    await skillFormPage.fillId(uniqueSkillId);
    await skillFormPage.fillName(uniqueSkillId);
    await skillFormPage.fillDescription('Skill created by e2e test');
    await skillFormPage.fillContent('These are the instructions for this test skill.');

    // Submit the form
    await skillFormPage.submitForm();

    // Should navigate back to skills list
    await skillsPage.waitForPageToLoad();

    // The new skill should appear in the table
    await skillsPage.searchForSkill(uniqueSkillId);
    await skillsPage.expectSkillRowVisible(uniqueSkillId);
  });

  test('should view the built-in data-exploration skill as read-only', async ({
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage, skillFormPage } = pageObjects;

    // Navigate to skills list
    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();

    // The built-in skill should be visible in the table
    await skillsPage.expectSkillRowVisible('data-exploration');

    // Click to view the built-in skill
    const skillLink = skillsPage.getSkillLink('data-exploration');
    await expect(skillLink).toBeVisible();
    await skillLink.click();

    // Should show the skill details page
    await skillFormPage.waitForPageToLoad();
    await expect(skillFormPage.getFormPage()).toBeVisible();

    // Should show read-only badge for built-in skills
    await skillFormPage.expectReadOnlyBadgeVisible();
  });

  test('should view a user-created skill', async ({ pageObjects, browserAuth, kbnClient }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Create a skill via API first
    await kbnClient.request({
      method: 'POST',
      path: '/api/agent_builder/skills',
      headers: API_VERSION_HEADER,
      body: {
        id: uniqueSkillId,
        name: uniqueSkillId,
        description: 'Description for viewing',
        content: 'Content for viewing.',
        tool_ids: [],
      },
    });

    const { skillFormPage } = pageObjects;

    // Navigate directly to the skill detail page
    await skillFormPage.navigateToDetails(uniqueSkillId);
    await skillFormPage.waitForPageToLoad();
    await expect(skillFormPage.getFormPage()).toBeVisible();

    // Should not show read-only badge for user-created skills
    await skillFormPage.expectReadOnlyBadgeNotVisible();
  });

  test('should edit an existing user-created skill', async ({
    pageObjects,
    browserAuth,
    kbnClient,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Create a skill via API first
    await kbnClient.request({
      method: 'POST',
      path: '/api/agent_builder/skills',
      headers: API_VERSION_HEADER,
      body: {
        id: uniqueSkillId,
        name: uniqueSkillId,
        description: 'Description before edit',
        content: 'Content before edit.',
        tool_ids: [],
      },
    });

    const { skillsPage, skillFormPage } = pageObjects;

    // Navigate to the skill's detail page
    await skillFormPage.navigateToDetails(uniqueSkillId);
    await skillFormPage.waitForPageToLoad();
    await skillFormPage.waitForFormToLoad();

    // Should not show read-only badge for user-created skills
    await skillFormPage.expectReadOnlyBadgeNotVisible();

    // Update content field
    await skillFormPage.fillContent('Content after edit.');

    // Save
    await skillFormPage.clickSaveButton();

    // Should navigate back to skills list
    await skillsPage.waitForPageToLoad();
  });

  test('should delete a user-created skill via API and verify removal in UI', async ({
    pageObjects,
    browserAuth,
    kbnClient,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Create a skill via API first
    await kbnClient.request({
      method: 'POST',
      path: '/api/agent_builder/skills',
      headers: API_VERSION_HEADER,
      body: {
        id: uniqueSkillId,
        name: uniqueSkillId,
        description: 'This skill will be deleted',
        content: 'Delete me.',
        tool_ids: [],
      },
    });

    const { skillsPage } = pageObjects;

    // Navigate to skills list and verify the skill is present
    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();
    await skillsPage.searchForSkill(uniqueSkillId);
    await skillsPage.expectSkillRowVisible(uniqueSkillId);

    // Delete via API
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/agent_builder/skills/${uniqueSkillId}`,
      headers: API_VERSION_HEADER,
    });

    // Refresh the page and verify the skill is gone
    await skillsPage.navigateTo();
    await skillsPage.waitForPageToLoad();
    await skillsPage.searchForSkill(uniqueSkillId);
    await skillsPage.expectSkillRowNotVisible(uniqueSkillId);
  });

  test('should cancel skill creation and return to list', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { skillsPage, skillFormPage } = pageObjects;

    await skillFormPage.navigateToCreate();
    await skillFormPage.waitForPageToLoad();
    await skillFormPage.waitForFormToLoad();

    // Fill partial data
    await skillFormPage.fillId(uniqueSkillId);
    await skillFormPage.fillName(uniqueSkillId);

    // Click cancel
    await skillFormPage.clickCancelButton();

    // Should navigate back to skills list
    await skillsPage.waitForPageToLoad();
    await expect(skillsPage.getSkillsPageContainer()).toBeVisible();
  });
});
