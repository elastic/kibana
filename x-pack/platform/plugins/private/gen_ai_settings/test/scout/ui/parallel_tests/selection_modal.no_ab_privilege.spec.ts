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
import { AIAssistantType } from '../fixtures/constants';

spaceTest.describe(
  'GenAI Settings - Selection Modal without Agent Builder Privileges',
  { tag: ['@local-stateful-classic'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [AI_CHAT_EXPERIENCE_TYPE]: AIChatExperience.Classic });
      await browserAuth.loginAsNonAgentBuilderUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest(
      'AI Agent card selection modal is disabled without Agent Builder privileges',
      async ({ pageObjects }) => {
        await spaceTest.step('verify AI Assistant visibility is set to default', async () => {
          const aiAssistantVisibilityField =
            pageObjects.genAiSettings.getAiAssistantVisibilityField();
          await expect(aiAssistantVisibilityField).toHaveValue(AIAssistantType.Default);
        });

        await spaceTest.step('open card selection modal', async () => {
          const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
          await expect(aiAssistantNavButton).toBeVisible();
          await aiAssistantNavButton.click();
          const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
          await expect(cardSelectionModal).toBeVisible();
        });

        await spaceTest.step('verify AI Agent card button is disabled', async () => {
          await pageObjects.genAiSettings.expectCardsState({
            observability: true,
            security: true,
            agent: false,
          });
        });
      }
    );
  }
);
