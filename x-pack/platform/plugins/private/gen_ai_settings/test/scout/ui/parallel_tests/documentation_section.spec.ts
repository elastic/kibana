/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { tags } from '@kbn/scout';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Documentation Section',
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
      'should show Documentation section in Agent mode and hide it in Classic mode',
      async ({ pageObjects }) => {
        await spaceTest.step(
          'verify Documentation section is visible in Agent mode by default',
          async () => {
            const documentationSection = pageObjects.genAiSettings.getDocumentationSection();
            await expect(documentationSection).toBeVisible();
            const documentationTable = pageObjects.genAiSettings.getDocumentationTable();
            await expect(documentationTable).toBeVisible();
          }
        );

        await spaceTest.step('switch to Classic mode', async () => {
          const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
          await chatExperienceField.selectOption({ value: AIChatExperience.Classic });
        });

        await spaceTest.step('save settings and wait for reload', async () => {
          const bottomBar = pageObjects.genAiSettings.getSaveButtonBottomBar();
          await pageObjects.genAiSettings.getSaveButton().click();
          await expect(bottomBar).toBeHidden();
          await pageObjects.genAiSettings.waitForPageToLoad();
        });

        await spaceTest.step('verify Documentation section is hidden in Classic mode', async () => {
          const documentationSection = pageObjects.genAiSettings.getDocumentationSection();
          await expect(documentationSection).toBeHidden();
        });
      }
    );
  }
);
