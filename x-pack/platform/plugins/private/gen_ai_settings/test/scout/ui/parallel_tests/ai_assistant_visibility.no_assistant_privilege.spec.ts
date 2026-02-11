/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
  AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import { spaceTest } from '../fixtures';
import { AIAssistantType } from '../fixtures/constants';

spaceTest.describe(
  'GenAI Settings - AI Assistant Visibility without AI Assistants Privileges',
  { tag: ['@ess', '@svlOblt', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      // Set AI Assistant, because the AI Assistant nav button will be visible for default value
      await scoutSpace.uiSettings.set({
        [AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE]: AIAssistantType.Observability,
      });
      await browserAuth.loginAsNonAssistantUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
      await scoutSpace.uiSettings.unset(AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE);
    });

    spaceTest(
      'should not display AI Assistant elements without privileges',
      async ({ pageObjects }) => {
        await spaceTest.step(
          'should not display AI Assistant nav button without privileges',
          async () => {
            const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
            await expect(aiAssistantNavButton).toBeHidden();
          }
        );

        await spaceTest.step('should not display AI Assistants side nav button', async () => {
          const aiAssistantSideNavButton = pageObjects.genAiSettings.getAIAssistantsSideNavButton();
          await expect(aiAssistantSideNavButton).toBeHidden();
        });
      }
    );
  }
);
