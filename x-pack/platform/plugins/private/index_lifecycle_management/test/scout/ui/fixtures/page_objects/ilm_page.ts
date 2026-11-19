/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { ScoutPage } from '@kbn/scout';

interface PolicyFormValues {
  policyName: string;
  warmEnabled?: boolean;
  coldEnabled?: boolean;
  frozenEnabled?: boolean;
  deleteEnabled?: boolean;
  snapshotRepository?: string;
}

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
  readonly searchBar;
  readonly requestButton;
  readonly requestFlyout;
  readonly addToTemplateAction;
  readonly addToTemplateModal;
  readonly indexTemplatesFlyoutHeader;
  readonly deletePolicyModal;

  constructor(private readonly page: ScoutPage) {
    this.pageHeader = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.createPolicyButton = page.testSubj.locator('createPolicyButton');
    this.savePolicyButton = page.testSubj.locator('savePolicyButton');
    this.policyNameField = page.testSubj.locator('policyNameField');
    this.policyFlyoutTitle = page.testSubj.locator('policyFlyoutTitle');
    this.policyFlyoutCloseButton = page.testSubj.locator('policyFlyoutCloseButton');
    this.editManagedPolicyCallOut = page.testSubj.locator('editManagedPolicyCallOut');
    this.editWarning = page.testSubj.locator('editWarning');
    this.saveAsNewSwitch = page.testSubj.locator('saveAsNewSwitch');
    this.navigationBlockConfirmModal = page.testSubj.locator('navigationBlockConfirmModal');
    this.kibanaLogo = page.getByTestId('logo').or(page.getByTestId('nav-header-logo'));
    this.searchBar = page.getByTestId('ilmSearchBar');
    this.requestButton = page.getByTestId('requestButton');
    this.requestFlyout = page.getByTestId('policyRequestJson');
    this.addToTemplateAction = page.getByTestId('addPolicyToTemplate');
    this.addToTemplateModal = page.getByTestId('addPolicyToTemplateModal');
    this.indexTemplatesFlyoutHeader = page.getByTestId('indexTemplatesFlyoutHeader');
    this.deletePolicyModal = page.getByTestId('deletePolicyModal');
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

  async openPolicyActionsMenu(policyName: string): Promise<void> {
    await this.getPolicyRow(policyName).getByTestId('euiCollapsedItemActionsButton').click();
  }

  async filterPolicies(name: string): Promise<void> {
    await this.searchBar.fill(name);
    // Clicking while the search box is focused does not register on the elements below it.
    await this.searchBar.blur();
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

  async fillPolicyForm({
    policyName,
    warmEnabled = false,
    coldEnabled = false,
    frozenEnabled = false,
    deleteEnabled = false,
    snapshotRepository,
  }: PolicyFormValues): Promise<void> {
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
    if (frozenEnabled) {
      await this.page.getByTestId('enablePhaseSwitch-frozen').click();
      await this.page.getByTestId('frozen-selectedMinimumAge').fill('20');
      if (snapshotRepository) {
        // The cold phase renders a combobox with the same test subject, so scope to frozen.
        const repositoryInput = this.page
          .getByTestId('frozen-phase')
          .getByTestId('searchableSnapshotCombobox')
          .getByTestId('comboBoxSearchInput');
        await repositoryInput.fill(snapshotRepository);
        await repositoryInput.press('Enter');
      }
    }
    if (deleteEnabled) {
      await this.page.testSubj.locator('enableDeletePhaseButton').click();
    }
  }

  async createPolicy(policy: PolicyFormValues): Promise<void> {
    await this.createPolicyButton.click();
    await this.fillPolicyForm(policy);
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
