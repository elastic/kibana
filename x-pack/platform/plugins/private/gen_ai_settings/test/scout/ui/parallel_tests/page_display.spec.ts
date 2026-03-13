/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Page Display',
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsFullAIPrivilegesUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest('should display correct UI elements', async ({ pageObjects }) => {
      await spaceTest.step('should display the GenAI Settings page title', async () => {
        const genAiSettingsPageTitle = pageObjects.genAiSettings.getGenAiSettingsPageTitle();
        await expect(genAiSettingsPageTitle).toBeVisible();
      });

      await spaceTest.step('should display the Chat Experience field', async () => {
        const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
        await expect(chatExperienceField).toBeVisible();
      });
    });
  }
);
