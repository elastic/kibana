/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { spaceTest, setSpaceSolution } from '../../fixtures';

/**
 * Tests that the AI Agent nav button is visible when the Chat Experience is set to Agent mode
 * in a Security solution space.
 */
spaceTest.describe(
  'GenAI Settings - AI Agent Nav Button in Search Space',
  { tag: ['@ess'] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
      await setSpaceSolution(kbnClient, scoutSpace.id, 'es');
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace, kbnClient }) => {
      await setSpaceSolution(kbnClient, scoutSpace.id, 'classic');
    });

    spaceTest('should set Chat Experience to Agent mode by default', async ({ pageObjects }) => {
      await spaceTest.step('verify Chat Experience is set to Agent mode', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toHaveValue(AIChatExperience.Agent);
      });

      await spaceTest.step('verify AI Agent nav button is visible', async () => {
        const aiAgentNavButton = pageObjects.genAiSettings.getAIAgentNavButton();
        await expect(aiAgentNavButton).toBeVisible();
      });
    });
  }
);
