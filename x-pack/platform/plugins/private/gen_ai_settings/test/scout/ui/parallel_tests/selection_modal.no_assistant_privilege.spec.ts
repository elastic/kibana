/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'GenAI Settings - Selection Modal without AI Assistants Privileges',
  { tag: ['@ess'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsNonAssistantUser();
      await pageObjects.genAiSettings.navigateTo();
    });

    spaceTest(
      'AI Assistant cards should be disabled without AI Assistants privileges',
      async ({ pageObjects }) => {
        await spaceTest.step('open card selection modal', async () => {
          const aiAssistantNavButton = pageObjects.genAiSettings.getAiAssistantNavButton();
          await expect(aiAssistantNavButton).toBeVisible();
          await aiAssistantNavButton.click();
          const cardSelectionModal = pageObjects.genAiSettings.getCardSelectionModal();
          await expect(cardSelectionModal).toBeVisible();
        });

        await spaceTest.step('verify AI Assistant cards are disabled', async () => {
          await pageObjects.genAiSettings.expectCardsState({
            observability: false,
            security: false,
            agent: true,
          });
        });
      }
    );
  }
);
