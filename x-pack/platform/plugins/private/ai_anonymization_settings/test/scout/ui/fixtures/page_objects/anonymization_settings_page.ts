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
   * Get the header "Masking enabled" master-switch element
   */
  getHeaderMaskingSwitch() {
    return this.page.testSubj.locator('aiAnonymizationSettingsHeaderMaskingSwitch');
  }

  /**
   * Get the "Tech Preview" badge next to the page title
   */
  getTechPreviewBadge() {
    return this.page.testSubj.locator('aiAnonymizationSettingsTechPreviewBadge');
  }

  async goToTab(tab: 'builtin' | 'custom' | 'tester' | 'settings') {
    await this.page.testSubj.click(`aiAnonymizationSettingsTab-${tab}`);
  }

  /**
   * Get the Built-in patterns table element
   */
  getBuiltInPatternsTable() {
    return this.page.testSubj.locator('aiAnonymizationSettingsBuiltInPatternsTable');
  }

  /**
   * Get the Custom patterns table element
   */
  getCustomPatternsTable() {
    return this.page.testSubj.locator('aiAnonymizationSettingsCustomPatternsTable');
  }

  /**
   * Get the "Add pattern" button on the Custom patterns tab
   */
  getAddPatternButton() {
    return this.page.testSubj.locator('aiAnonymizationSettingsAddPatternButton');
  }

  /**
   * Get the Add/Edit pattern flyout element
   */
  getPatternFlyout() {
    return this.page.testSubj.locator('aiAnonymizationSettingsPatternFlyout');
  }

  /**
   * Get the "Test pattern" button on the Pattern tester tab (or inside the flyout)
   */
  getTestPatternButton() {
    return this.page.testSubj.locator('aiAnonymizationSettingsTestPatternButton');
  }

  /**
   * Get the "Mask PII in AI requests" switch on the Settings tab
   */
  getSettingsMaskingEnabledSwitch() {
    return this.page.testSubj.locator('aiAnonymizationSettingsMaskingEnabledSwitch');
  }

  /**
   * Get the on-failure radio group on the Settings tab
   */
  getOnFailureRadioGroup() {
    return this.page.testSubj.locator('aiAnonymizationSettingsOnFailureRadioGroup');
  }
}
