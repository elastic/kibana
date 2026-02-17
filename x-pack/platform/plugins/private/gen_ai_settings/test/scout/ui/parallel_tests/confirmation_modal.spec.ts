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
  'GenAI Settings - Confirmation Modal',
  { tag: ['@ess', '@svlOblt', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsFullAIPrivilegesUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    // The happy path is covered by other tests within same directory
    spaceTest('should cancel Agent selection without saving changes', async ({ pageObjects }) => {
      await spaceTest.step('verify current chat experience is Classic', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Classic);
      });

      await spaceTest.step('select Agent from dropdown', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await chatExperienceField.selectOption({ value: AIChatExperience.Agent });
      });

      await spaceTest.step('verify cancel works', async () => {
        const confirmModal = pageObjects.genAiSettings.getConfirmModal();
        await expect(confirmModal).toBeVisible();
        await pageObjects.genAiSettings.getConfirmModalCancelButton().click();
        await expect(confirmModal).toBeHidden();
      });

      await spaceTest.step('verify chat experience setting was not changed', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Classic);
      });
    });
  }
);
