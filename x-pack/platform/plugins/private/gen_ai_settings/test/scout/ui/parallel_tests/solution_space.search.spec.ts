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

spaceTest.describe(
  'GenAI Settings - Change Chat Experience to Classic in Search Space',
  { tag: ['@ess'] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('es');
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('classic');
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest('should change Chat Experience to Classic', async ({ pageObjects }) => {
      await spaceTest.step('verify Chat Experience is set to Agent mode by default', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('verify Documentation section is visible', async () => {
        const documentationSection = pageObjects.genAiSettings.getDocumentationSection();
        await expect(documentationSection).toBeVisible();
      });

      await spaceTest.step('verify AI Agent nav button is visible', async () => {
        const aiAgentNavButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavButton).toBeVisible();
      });

      await spaceTest.step('verify Agent side nav button is shown', async () => {
        const agentSideNavButton = pageObjects.genAiSettings.getAgentSideNavButton();
        await expect(agentSideNavButton).toBeVisible();
      });

      await spaceTest.step('switch to Classic mode', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await chatExperienceField.selectOption({ value: AIChatExperience.Classic });
      });

      await spaceTest.step('save settings and wait for reload', async () => {
        const bottomBar = pageObjects.genAiSettings.getSaveButtonBottomBar();
        await pageObjects.genAiSettings.getSaveButton().click();
        await expect(bottomBar).toBeHidden();
        await pageObjects.genAiSettings.waitForPageToLoad();
      });

      await spaceTest.step('verify Chat Experience is set to Classic mode', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Classic);
      });

      await spaceTest.step('verify AI Agent nav button is hidden', async () => {
        const aiAgentNavButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavButton).toBeHidden();
      });

      await spaceTest.step('verify AI Assistant nav button is visible', async () => {
        const getAiAssistantNavButton =
          pageObjects.genAiSettings.getAIAssistantNavButtonObltSearch();
        await expect(getAiAssistantNavButton).toBeVisible();
      });
    });
  }
);
