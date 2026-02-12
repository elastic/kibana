/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { spaceTest } from '../fixtures';
import { AIAssistantType } from '../fixtures/constants';

spaceTest.describe('GenAI Settings - AI Selection Modal Changes', { tag: ['@ess'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.genAiSettings.navigateTo();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
  });

  spaceTest(
    'should open card selection modal when AI Assistant visibility is set to default',
    async ({ pageObjects, page }) => {
      await spaceTest.step('verify AI Assistant visibility is set to default', async () => {
        const aiAssistantVisibilityField =
          pageObjects.genAiSettings.getAiAssistantVisibilityField();
        await expect(aiAssistantVisibilityField).toHaveValue(AIAssistantType.Default);
      });

      await spaceTest.step('open card selection modal', async () => {
        const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
        await expect(aiAssistantNavButton).toBeVisible();
        await aiAssistantNavButton.click();
        const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
        await expect(cardSelectionModal).toBeVisible();
      });

      await spaceTest.step('verify cards are enabled', async () => {
        await pageObjects.genAiSettings.expectCardsState({
          observability: true,
          security: true,
          agent: true,
        });
      });

      await spaceTest.step('select AI Agent card', async () => {
        await pageObjects.genAiSettings.getCardSwitch('agent').click();
        await pageObjects.genAiSettings.getSelectionModalApplyButton().click();
      });

      await spaceTest.step('proceed with confirmation modal', async () => {
        const confirmationModal = pageObjects.genAiSettings.getConfirmModal();
        await expect(confirmationModal).toBeVisible();
        await pageObjects.genAiSettings.getConfirmModalConfirmButton().click();
        const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
        await expect(cardSelectionModal).toBeHidden();
      });

      await spaceTest.step('verify AI Agent flyout is visible', async () => {
        const aiAgentFlyout = pageObjects.genAiSettings.getAIAgentFlyout();
        await expect(aiAgentFlyout).toBeVisible();
      });

      await spaceTest.step('verify AI chat experience is set to Agent', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('verify AI Agent Nav button is visible', async () => {
        const aiAgentNavControlButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavControlButton).toBeVisible();
      });

      await spaceTest.step('verify AI Assistants side nav button is hidden', async () => {
        await page.reload(); // Currently page reload is required to see the changes
        await pageObjects.genAiSettings.waitForPageToLoad();
        const aiAssistantSideNavButton = pageObjects.genAiSettings.getAIAssistantsSideNavButton();
        await expect(aiAssistantSideNavButton).toBeHidden();
      });
    }
  );
});
