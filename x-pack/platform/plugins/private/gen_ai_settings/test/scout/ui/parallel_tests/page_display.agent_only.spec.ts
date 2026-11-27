/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Page Display on projects without the classic AI Assistant',
  { tag: [...tags.serverless.search, ...tags.serverless.vectordb] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsFullAIPrivilegesUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest(
      'should display correct UI elements',
      async ({ pageObjects, kbnClient, scoutSpace }) => {
        await spaceTest.step('should display the GenAI Settings page title', async () => {
          const genAiSettingsPageTitle = pageObjects.genAiSettings.getGenAiSettingsPageTitle();
          await expect(genAiSettingsPageTitle).toBeVisible();
        });

        await spaceTest.step(
          'should not display the Chat Experience field because there is no classic AI Assistant',
          async () => {
            const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
            await expect(chatExperienceField).toBeHidden();
          }
        );

        await spaceTest.step(
          'should not allow switching to the classic chat experience',
          async () => {
            await expect(
              kbnClient.request({
                method: 'POST',
                path: `/s/${scoutSpace.id}/internal/kibana/settings`,
                body: { changes: { [AI_CHAT_EXPERIENCE_TYPE]: AIChatExperience.Classic } },
                retries: 1,
              })
            ).rejects.toThrow(/overridden/);
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
