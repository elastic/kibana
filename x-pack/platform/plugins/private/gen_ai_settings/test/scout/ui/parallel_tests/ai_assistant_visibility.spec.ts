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

spaceTest.describe('GenAI Settings - AI Assistant Visibility', { tag: ['@ess'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.genAiSettings.navigateTo();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
  });

  spaceTest(
    'should hide AI Assistant Visibility setting in Agent mode',
    async ({ pageObjects }) => {
      await spaceTest.step(
        'verify AI Assistant Visibility is visible in Classic mode',
        async () => {
          const aiAssistantVisibilityField =
            pageObjects.genAiSettings.getAiAssistantVisibilityField();
          await expect(aiAssistantVisibilityField).toBeVisible();
        }
      );

      await spaceTest.step('switch to Agent mode', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await chatExperienceField.selectOption({ value: AIChatExperience.Agent });
      });

      await spaceTest.step('confirm Agent selection', async () => {
        const confirmationModal = pageObjects.genAiSettings.getConfirmModal();
        await expect(confirmationModal).toBeVisible();
        await pageObjects.genAiSettings.getConfirmModalConfirmButton().click();
      });

      await spaceTest.step('save settings and wait for reload', async () => {
        const bottomBar = pageObjects.genAiSettings.getSaveButtonBottomBar();
        await pageObjects.genAiSettings.getSaveButton().click();
        await expect(bottomBar).toBeHidden();
        await pageObjects.genAiSettings.waitForPageToLoad();
      });

      await spaceTest.step('verify AI Assistant Visibility setting is hidden', async () => {
        const aiAssistantVisibilityField =
          pageObjects.genAiSettings.getAiAssistantVisibilityField();
        await expect(aiAssistantVisibilityField).toBeHidden();
      });
    }
  );
});
