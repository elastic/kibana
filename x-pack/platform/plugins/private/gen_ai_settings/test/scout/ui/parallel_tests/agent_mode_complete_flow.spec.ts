/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { tags } from '@kbn/scout';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Agent Mode Complete Flow',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsFullAIPrivilegesUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest(
      'should show Agent mode as default and display Agent button',
      async ({ pageObjects }) => {
        await spaceTest.step('verify Agent is the default chat experience', async () => {
          const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
          await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
        });

        await spaceTest.step('verify Agent Builder nav button is visible', async () => {
          const aiAgentNavControlButton = pageObjects.genAiSettings.getAIAgentNavButton();
          await expect(aiAgentNavControlButton).toBeVisible();
        });

        await spaceTest.step('verify Agent mode is persisted after reload', async () => {
          await pageObjects.genAiSettings.navigateTo();
          const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
          await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
        });
      }
    );

    spaceTest('should switch to Classic mode from Agent default', async ({ pageObjects }) => {
      await spaceTest.step('verify Agent is the default chat experience', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('select Classic from dropdown', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await chatExperienceField.selectOption({ value: AIChatExperience.Classic });
      });

      await spaceTest.step('save settings and wait for reload', async () => {
        const bottomBar = pageObjects.genAiSettings.getSaveButtonBottomBar();
        await pageObjects.genAiSettings.getSaveButton().click();
        await expect(bottomBar).toBeHidden();
        await pageObjects.genAiSettings.waitForPageToLoad();
      });

      await spaceTest.step('verify Classic mode is persisted after reload', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Classic);
      });

      await spaceTest.step('verify Agent Builder nav button is hidden', async () => {
        const aiAgentNavControlButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavControlButton).toBeHidden();
      });
    });
  }
);
