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
  'GenAI Settings - Page Display without AI Assistants Privileges',
  { tag: ['@ess', '@svlOblt', '@svlSecurity', '@svlSearch'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [AI_CHAT_EXPERIENCE_TYPE]: AIChatExperience.Agent });
      await browserAuth.loginAsNonAssistantUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest(
      'should display correct UI elements without AI Assistants privileges',
      async ({ pageObjects }) => {
        await spaceTest.step('should display the GenAI Settings page title', async () => {
          const genAiSettingsPageTitle = pageObjects.genAiSettings.getGenAiSettingsPageTitle();
          await expect(genAiSettingsPageTitle).toBeVisible();
        });

        await spaceTest.step(
          'should not display the Chat Experience field without AI Assistants privileges',
          async () => {
            const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
            await expect(chatExperienceField).toBeHidden();
          }
        );

        await spaceTest.step('should display AI Agent nav button', async () => {
          const aiAgentNavButton = pageObjects.genAiSettings.getAIAgentNavButton();
          await expect(aiAgentNavButton).toBeVisible();
        });
      }
    );
  }
);
