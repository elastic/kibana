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

const testSubj = (id: string) => `[data-test-subj="${id}"]`;

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
    // Scoped to the flyout: `apiKeyStatus` is also rendered once per row in the grid's Status
    // column, so a page-wide locator would resolve to many elements.
    this.flyoutTitle = this.flyout.locator(testSubj('apiKeyFlyoutTitle'));
    this.nameInput = this.flyout.locator(testSubj('apiKeyNameInput'));
    this.customExpirationSwitch = this.flyout.locator(testSubj('apiKeyCustomExpirationSwitch'));
    this.customExpirationInput = this.flyout.locator(testSubj('apiKeyCustomExpirationInput'));
    this.metadataSwitch = this.flyout.locator(testSubj('apiKeysMetadataSwitch'));
    this.roleDescriptorsSwitch = this.flyout.locator(testSubj('apiKeysRoleDescriptorsSwitch'));
    this.keyStatus = this.flyout.locator(testSubj('apiKeyStatus'));
    this.submitButton = this.flyout.locator(testSubj('formFlyoutSubmitButton'));
    this.cancelButton = this.flyout.locator(testSubj('formFlyoutCancelButton'));
    this.updateSuccessToast = page.testSubj.locator('updateApiKeySuccessToast');

    this.anyRowName = page.locator('[data-test-subj^="apiKeyRowName-"]');
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

  /** Names of the API keys on the page currently shown by the grid. */
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

  /**
   * Reveals both JSON editors in the update flyout. Monaco models are only registered once their
   * editor mounts, and `KibanaCodeEditorWrapper` addresses models by index — toggling role
   * descriptors first and metadata second fixes them at index 0 and 1 respectively.
   */
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

  /** These are toggles: the grid opens with `Personal` already selected, so the first click clears it. */
  async toggleTypeFilter(type: ApiKeyTypeFilter) {
    await this.page.testSubj.locator(TYPE_FILTER_TEST_SUBJ[type]).click();
  }

  async toggleExpiryFilter(expiry: ApiKeyExpiryFilter) {
    await this.page.testSubj.locator(EXPIRY_FILTER_TEST_SUBJ[expiry]).click();
  }

  async openOwnerFilter() {
    await this.ownerFilterButton.click();
  }

  /**
   * `EuiFieldSearch` runs an incremental search from its `keyup` handler, which `fill()` never
   * dispatches — the text would land in the box without the query ever being applied. Select-all
   * plus real keystrokes replaces any previous query and triggers the search.
   */
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
