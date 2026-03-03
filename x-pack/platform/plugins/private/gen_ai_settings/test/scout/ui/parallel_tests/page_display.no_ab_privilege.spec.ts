/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Page Display without Agent Builder Privileges',
  { tag: ['@ess', '@svlOblt', '@svlSecurity', '@svlSearch'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsNonAgentBuilderUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest(
      'should display correct UI elements without Agent Builder privileges',
      async ({ pageObjects }) => {
        await spaceTest.step('should display the GenAI Settings page title', async () => {
          const genAiSettingsPageTitle = pageObjects.genAiSettings.getGenAiSettingsPageTitle();
          await expect(genAiSettingsPageTitle).toBeVisible();
        });

        await spaceTest.step(
          'should not display the Chat Experience field without Agent Builder privileges',
          async () => {
            const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
            await expect(chatExperienceField).toBeHidden();
          }
        );
      }
    );
  }
);
