/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export type ApiKeyTypeFilter = 'personal' | 'managed' | 'cross_cluster';
export type ApiKeyExpiryFilter = 'active' | 'expired';

const TYPE_FILTER_TEST_SUBJ: Record<ApiKeyTypeFilter, string> = {
  personal: 'personalFilterButton',
  managed: 'managedFilterButton',
  cross_cluster: 'crossClusterFilterButton',
};

const EXPIRY_FILTER_TEST_SUBJ: Record<ApiKeyExpiryFilter, string> = {
  active: 'activeFilterButton',
  expired: 'expiredFilterButton',
};

export class ApiKeysApp {
  public readonly codeEditor: KibanaCodeEditorWrapper;

  public readonly promptCreateButton: Locator;
  public readonly tableCreateButton: Locator;
  public readonly emptyPromptTitle: Locator;
  public readonly createdCallOut: Locator;

  public readonly flyout: Locator;
  public readonly flyoutTitle: Locator;
  public readonly nameInput: Locator;
  public readonly customExpirationSwitch: Locator;
  public readonly customExpirationInput: Locator;
  public readonly metadataSwitch: Locator;
  public readonly roleDescriptorsSwitch: Locator;
  public readonly keyStatus: Locator;
  public readonly submitButton: Locator;
  public readonly cancelButton: Locator;
  public readonly updateSuccessToast: Locator;

  public readonly anyRowName: Locator;
  public readonly searchBar: Locator;
  public readonly ownerFilterButton: Locator;
  public readonly selectAllCheckbox: Locator;
  public readonly bulkInvalidateButton: Locator;
  public readonly nextPageButton: Locator;
  public readonly previousPageButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.promptCreateButton = page.testSubj.locator('apiKeysCreatePromptButton');
    this.tableCreateButton = page.testSubj.locator('apiKeysCreateTableButton');
    this.emptyPromptTitle = page.testSubj.locator('apiKeysEmptyPromptTitle');
    this.createdCallOut = page.testSubj.locator('apiKeyCreatedCallOut');

    this.flyout = page.testSubj.locator('apiKeyFlyout');
    this.flyoutTitle = page.testSubj.locator('apiKeyFlyout > apiKeyFlyoutTitle');
    this.nameInput = page.testSubj.locator('apiKeyFlyout > apiKeyNameInput');
    this.customExpirationSwitch = page.testSubj.locator(
      'apiKeyFlyout > apiKeyCustomExpirationSwitch'
    );
    this.customExpirationInput = page.testSubj.locator(
      'apiKeyFlyout > apiKeyCustomExpirationInput'
    );
    this.metadataSwitch = page.testSubj.locator('apiKeyFlyout > apiKeysMetadataSwitch');
    this.roleDescriptorsSwitch = page.testSubj.locator(
      'apiKeyFlyout > apiKeysRoleDescriptorsSwitch'
    );
    this.keyStatus = page.testSubj.locator('apiKeyFlyout > apiKeyStatus');
    this.submitButton = page.testSubj.locator('apiKeyFlyout > formFlyoutSubmitButton');
    this.cancelButton = page.testSubj.locator('apiKeyFlyout > formFlyoutCancelButton');
    this.updateSuccessToast = page.testSubj.locator('updateApiKeySuccessToast');

    this.anyRowName = page.testSubj.locator('^apiKeyRowName-');
    this.searchBar = page.testSubj.locator('apiKeysSearchBar');
    this.ownerFilterButton = page.testSubj.locator('ownerFilterButton');
    this.selectAllCheckbox = page.testSubj.locator('checkboxSelectAll');
    this.bulkInvalidateButton = page.testSubj.locator('bulkInvalidateActionButton');
    this.nextPageButton = page.testSubj.locator('apiKeysTableNextPageButton');
    this.previousPageButton = page.testSubj.locator('apiKeysTablePreviousPageButton');
  }

  async goto() {
    await this.page.gotoApp('management/security/api_keys');
  }

  rowByName(apiKeyName: string): Locator {
    return this.page.testSubj.locator(`apiKeyRowName-${apiKeyName}`);
  }

  async visibleApiKeyNames(): Promise<string[]> {
    return this.anyRowName.allTextContents();
  }

  ownerFilterOption(username: string): Locator {
    return this.page.testSubj.locator(`userProfileSelectableOption-${username}`);
  }

  async waitForTableLoaded() {
    await this.page.testSubj.locator('apiKeysSearchBar').waitFor({ state: 'visible' });
  }

  async clickCreateFromPrompt() {
    await this.promptCreateButton.click();
    await this.flyout.waitFor({ state: 'visible' });
  }

  async clickCreateFromTable() {
    await this.tableCreateButton.click();
    await this.flyout.waitFor({ state: 'visible' });
  }

  async openApiKey(apiKeyName: string) {
    await this.rowByName(apiKeyName).click();
    await this.flyout.waitFor({ state: 'visible' });
  }

  async setName(apiKeyName: string) {
    await this.nameInput.fill(apiKeyName);
  }

  async setCustomExpiration(days: string) {
    await this.customExpirationSwitch.click();
    await this.customExpirationInput.fill(days);
  }

  async submitFlyout() {
    await this.submitButton.click();
    await this.flyout.waitFor({ state: 'hidden' });
  }

  async cancelFlyout() {
    await this.cancelButton.click();
    await this.flyout.waitFor({ state: 'hidden' });
  }

  // Toggle order fixes the Monaco models at index 0 (role descriptors) and 1 (metadata).
  async revealJsonEditors() {
    await this.roleDescriptorsSwitch.click();
    await this.codeEditor.waitCodeEditorReady('apiKeysRoleDescriptorsCodeEditor');
    await this.metadataSwitch.click();
    await this.codeEditor.waitCodeEditorReady('apiKeysMetadataCodeEditor');
  }

  async getRoleDescriptorsValue() {
    return this.codeEditor.getCodeEditorValue(0);
  }

  async getMetadataValue() {
    return this.codeEditor.getCodeEditorValue(1);
  }

  async setRoleDescriptorsValue(value: string) {
    await this.codeEditor.setCodeEditorValue(value, 0);
  }

  async setMetadataValue(value: string) {
    await this.codeEditor.setCodeEditorValue(value, 1);
  }

  async deleteApiKey(apiKeyName: string) {
    await this.page.testSubj.locator(`apiKeysTableDeleteAction-${apiKeyName}`).click();
    await this.confirmDeletion();
    await this.rowByName(apiKeyName).waitFor({ state: 'hidden' });
  }

  async bulkDeleteAllApiKeys() {
    await this.selectAllCheckbox.click();
    await this.bulkInvalidateButton.click();
    await this.confirmDeletion();
  }

  async toggleTypeFilter(type: ApiKeyTypeFilter) {
    await this.page.testSubj.locator(TYPE_FILTER_TEST_SUBJ[type]).click();
  }

  async toggleExpiryFilter(expiry: ApiKeyExpiryFilter) {
    await this.page.testSubj.locator(EXPIRY_FILTER_TEST_SUBJ[expiry]).click();
  }

  async openOwnerFilter() {
    await this.ownerFilterButton.click();
  }

  // EuiFieldSearch runs its incremental search on `keyup`, which `fill()` never dispatches.
  async search(query: string) {
    await this.searchBar.click();
    await this.searchBar.press('ControlOrMeta+a');
    await this.searchBar.pressSequentially(query);
  }

  async goToNextPage() {
    await this.nextPageButton.click();
  }

  async goToPreviousPage() {
    await this.previousPageButton.click();
  }

  private async confirmDeletion() {
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }
}
