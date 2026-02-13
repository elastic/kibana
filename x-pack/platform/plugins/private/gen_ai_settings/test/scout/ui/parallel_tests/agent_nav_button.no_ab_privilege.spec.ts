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
  'GenAI Settings - Agent Nav Button without Agent Builder Privileges',
  { tag: ['@ess', '@svlOblt', '@svlSecurity', '@svlSearch'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [AI_CHAT_EXPERIENCE_TYPE]: AIChatExperience.Agent });
      await browserAuth.loginAsNonAgentBuilderUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest(
      'should not display nav buttons without Agent Builder privileges',
      async ({ pageObjects }) => {
        await spaceTest.step(
          'should not display the AI Agent nav button without Agent Builder privileges',
          async () => {
            const aiAgentNavButton = pageObjects.genAiSettings.getAIAgentNavButton();
            await expect(aiAgentNavButton).toBeHidden();
          }
        );

        await spaceTest.step(
          'should not display AI Assistant nav button when AI Agent is selected',
          async () => {
            const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
            await expect(aiAssistantNavButton).toBeHidden();
          }
        );
      }
    );
  }
);
