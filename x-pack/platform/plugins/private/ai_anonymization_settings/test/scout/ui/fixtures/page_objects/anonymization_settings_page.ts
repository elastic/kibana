/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the Anonymization Settings management page
 */
export class AnonymizationSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigate to the Anonymization Settings page in Stack Management
   */
  async navigateTo() {
    await expect(async () => {
      await this.page.gotoApp('management/ai/aiAnonymizationSettings');
      await this.page.testSubj.waitForSelector('aiAnonymizationSettingsPage', {
        state: 'visible',
        timeout: 10_000,
      });
    }).toPass({ timeout: 70_000, intervals: [500, 1_000, 2_000] });
  }

  /**
   * Wait for the page to finish loading
   */
  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('aiAnonymizationSettingsPage', { state: 'visible' });
  }

  /**
   * Get the Anonymization Settings page title element
   */
  getPageTitle() {
    return this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
  }

  /**
   * Get the anonymization rules JSON editor field row element
   */
  getAnonymizationRulesField() {
    return this.page.testSubj.locator('management-settings-editField-ai:anonymizationSettings');
  }

  /**
   * Get the bottom bar container element (only visible when there are unsaved changes)
   */
  getBottomBar() {
    return this.page.testSubj.locator('aiAnonymizationSettingsBottomBar');
  }

  /**
   * Get the save button in the bottom bar
   */
  getSaveButton() {
    return this.page.testSubj.locator('aiAnonymizationSettingsBottomBarActionsButton');
  }

  /**
   * Get the discard changes button in the bottom bar
   */
  getDiscardChangesButton() {
    return this.page.testSubj.locator(
      'aiAnonymizationSettingsBottomBarActionsDiscardChangesButton'
    );
  }
}
