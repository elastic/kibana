/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { spaceTest } from '../../fixtures';

spaceTest.describe(
  'GenAI Settings - AI Selection Modal Changes',
  { tag: ['@ess', '@svlOblt', '@svlSecurity'] },
  () => {
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

        await spaceTest.step('verify AI Assistant Nav button is visible', async () => {
          const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
          await expect(aiAssistantNavButton).toBeVisible();
        });

        await spaceTest.step('Click on AI Assistant Nav button', async () => {
          await pageObjects.genAiSettings.getAiAssistantNavButton().click();
        });

        await spaceTest.step('Verify card selection modal is visible', async () => {
          const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
          await expect(cardSelectionModal).toBeVisible();
        });

        await spaceTest.step('Verify card selection modal has Observability card', async () => {
          const observabilityCard = pageObjects.genAiSettings.getObservabilityCard();
          await expect(observabilityCard).toBeVisible();
        });

        await spaceTest.step('Verify card selection modal has Security card', async () => {
          const securityCard = pageObjects.genAiSettings.getSecurityCard();
          await expect(securityCard).toBeVisible();
        });

        await spaceTest.step('Verify card selection modal has AI Agent card', async () => {
          const aiAgentCard = pageObjects.genAiSettings.getAIAgentCard();
          await expect(aiAgentCard).toBeVisible();
        });

        await spaceTest.step('Click on AI Agent card', async () => {
          await pageObjects.genAiSettings.getAIAgentCard().click();
        });

        await spaceTest.step('Click on Apply button', async () => {
          await pageObjects.genAiSettings.getSelectionModalApplyButton().click();
        });

        await spaceTest.step('Verify confirmation modal is visible', async () => {
          const confirmationModal = pageObjects.genAiSettings.getConfirmModal();
          await expect(confirmationModal).toBeVisible();
        });

        await spaceTest.step('Click on Continue button', async () => {
          await pageObjects.genAiSettings.getConfirmModalConfirmButton().click();
        });

        await spaceTest.step('Verify card selection modal is closed', async () => {
          const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
          await expect(cardSelectionModal).toBeHidden();
        });

        await spaceTest.step('Verify AI Agent flyout is visible', async () => {
          const aiAgentFlyout = pageObjects.genAiSettings.getAIAgentFlyout();
          await expect(aiAgentFlyout).toBeVisible();
        });

        await spaceTest.step('Verify AI chat experience is set to Agent', async () => {
          const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
          await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
        });

        await spaceTest.step('Verify AI Agent Nav button is visible', async () => {
          const aiAgentNavControlButton = pageObjects.genAiSettings.getAIAgentNavControlButton();
          await expect(aiAgentNavControlButton).toBeVisible();
        });

        await spaceTest.step('Verify AI Assistants side nav button is hidden', async () => {
          await page.reload(); // Currently page reload is required to see the changes
          await pageObjects.genAiSettings.waitForPageToLoad();
          const aiAssistantSideNavButton = pageObjects.genAiSettings.getAIAssistantsSideNavButton();
          await expect(aiAssistantSideNavButton).toBeHidden();
        });
      }
    );
  }
);
