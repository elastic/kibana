/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Agent Mode Complete Flow',
  { tag: ['@ess', '@svlOblt', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsFullAIPrivilegesUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest('should switch to Agent mode and show Agent button', async ({ pageObjects }) => {
      await spaceTest.step('verify current chat experience is Classic', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Classic);
      });

      await spaceTest.step('select Agent from dropdown', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await chatExperienceField.selectOption({ value: AIChatExperience.Agent });
      });

      await spaceTest.step('confirm Agent selection in modal', async () => {
        const confirmationModal = pageObjects.genAiSettings.getConfirmModal();
        await expect(confirmationModal).toBeVisible();
        await pageObjects.genAiSettings.getConfirmModalConfirmButton().click();
      });

      await spaceTest.step('verify Agent is selected in dropdown', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('save settings and wait for reload', async () => {
        const bottomBar = pageObjects.genAiSettings.getSaveButtonBottomBar();
        await pageObjects.genAiSettings.getSaveButton().click();
        await expect(bottomBar).toBeHidden();
        await pageObjects.genAiSettings.waitForPageToLoad();
      });

      await spaceTest.step('verify Agent mode is persisted after reload', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('verify Agent Builder nav button is visible', async () => {
        const aiAgentNavControlButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavControlButton).toBeVisible();
      });
    });
  }
);
