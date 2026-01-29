/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('GenAI Settings - Chat Experience', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.genAiSettings.navigateTo();
  });

  test('should display the GenAI Settings page', async ({ pageObjects }) => {
    const chatExperienceField = pageObjects.genAiSettings.getChatExperienceField();
    await expect(chatExperienceField).toBeVisible();
  });

  test.skip('should show confirmation modal when selecting Agent mode', async ({
    page,
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Get current chat experience value
    // 2. Select 'agent' from dropdown
    // 3. Verify confirmation modal appears
    // 4. Click confirm or cancel
    // 5. Verify expected behavior
  });

  test.skip('should hide AI Assistant Visibility setting in Agent mode', async ({
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Switch to Agent mode
    // 2. Save settings
    // 3. Wait for page reload
    // 4. Verify AI Assistant Visibility setting is hidden
  });

  test.skip('should show Documentation section in Agent mode', async ({ pageObjects }) => {
    // TODO: Implement test
    // 1. Switch to Agent mode
    // 2. Save settings
    // 3. Wait for page reload
    // 4. Verify Documentation section is visible
  });
});
