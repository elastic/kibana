/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const ILM_APP_PATH = 'management/data/index_lifecycle_management';

export class IlmPage {
  readonly pageHeader;
  readonly createPolicyButton;
  readonly savePolicyButton;
  readonly policyNameField;
  readonly policyFlyoutTitle;
  readonly policyFlyoutCloseButton;
  readonly editManagedPolicyCallOut;
  readonly editWarning;
  readonly saveAsNewSwitch;
  readonly navigationBlockConfirmModal;
  readonly kibanaLogo;

  constructor(private readonly page: ScoutPage) {
    this.pageHeader = page.testSubj.locator('ilmPageHeader');
    this.createPolicyButton = page.testSubj.locator('createPolicyButton');
    this.savePolicyButton = page.testSubj.locator('savePolicyButton');
    this.policyNameField = page.testSubj.locator('policyNameField');
    this.policyFlyoutTitle = page.testSubj.locator('policyFlyoutTitle');
    this.policyFlyoutCloseButton = page.testSubj.locator('policyFlyoutCloseButton');
    this.editManagedPolicyCallOut = page.testSubj.locator('editManagedPolicyCallOut');
    this.editWarning = page.testSubj.locator('editWarning');
    this.saveAsNewSwitch = page.testSubj.locator('saveAsNewSwitch');
    this.navigationBlockConfirmModal = page.testSubj.locator('navigationBlockConfirmModal');
    this.kibanaLogo = page.testSubj.locator('logo');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(ILM_APP_PATH);
    await this.pageHeader.waitFor({ state: 'visible' });
  }

  async gotoEditPolicy(policyName: string): Promise<void> {
    await this.page.gotoApp(`${ILM_APP_PATH}/policies/edit/${policyName}`);
  }

  getPolicyRow(policyName: string) {
    return this.page.testSubj.locator(`policyTableRow-${policyName}`);
  }

  async clickPolicyLink(policyName: string): Promise<void> {
    await this.getPolicyRow(policyName)
      .locator('[data-test-subj="policyTablePolicyNameLink"]')
      .click();
  }

  async increasePolicyListPageSize(): Promise<void> {
    await this.page.testSubj.locator('tablePaginationPopoverButton').click();
    await this.page.testSubj.locator('tablePagination-50-rows').click();
  }

  async createPolicy({
    policyName,
    warmEnabled = false,
    coldEnabled = false,
    deleteEnabled = false,
  }: {
    policyName: string;
    warmEnabled?: boolean;
    coldEnabled?: boolean;
    deleteEnabled?: boolean;
  }): Promise<void> {
    await this.createPolicyButton.click();
    await this.policyNameField.fill(policyName);

    if (warmEnabled) {
      await this.page.testSubj.locator('enablePhaseSwitch-warm').click();
      // Minimum age is required when a phase is enabled.
      await this.page.testSubj.locator('warm-selectedMinimumAge').fill('10');
    }
    if (coldEnabled) {
      // Cold phase defaults to a searchable snapshot action — a registered snapshot repository
      // must exist in the cluster, or saving the policy will fail with a 400.
      await this.page.testSubj.locator('enablePhaseSwitch-cold').click();
      await this.page.testSubj.locator('cold-selectedMinimumAge').fill('15');
    }
    if (deleteEnabled) {
      await this.page.testSubj.locator('enableDeletePhaseButton').click();
    }

    await this.savePolicyButton.click();
  }

  /**
   * Clone the currently-open policy under a new name using "Save as new policy".
   * Assumes the policy editor is already open.
   */
  async cloneCurrentPolicy(newName: string): Promise<void> {
    await this.saveAsNewSwitch.click();
    await this.policyNameField.fill(newName);
    await this.savePolicyButton.click();
  }
}
