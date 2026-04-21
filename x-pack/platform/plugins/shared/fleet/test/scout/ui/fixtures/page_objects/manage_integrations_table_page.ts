/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

export class ManageIntegrationsTablePage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations/browse');
    await this.page.testSubj.locator('manageCreatedIntegrationsLink').click();
    await this.getTable().waitFor({ state: 'visible' });
  }

  async navigateToEmpty() {
    await this.page.gotoApp('integrations/browse', { params: { view: 'manage' } });
  }

  getTable() {
    return this.page.testSubj.locator('manageIntegrationsTable');
  }

  getErrorCallout() {
    return this.page.testSubj.locator('manageIntegrationsTableError');
  }

  getTableRows() {
    return this.getTable().locator('tbody tr');
  }

  getRowByTitle(title: string) {
    return this.getTable().locator(`tr:has-text("${title}")`);
  }

  getReviewApproveInlineBtn(rowTitle: string) {
    return this.getRowByTitle(rowTitle).getByTestId('manageIntegrationReviewApproveInlineBtn');
  }

  getSearchInput() {
    return this.page.getByPlaceholder('Search integrations');
  }

  async searchFor(text: string) {
    const input = this.getSearchInput();
    await input.click();
    await input.pressSequentially(text);
  }

  getActionsButton(rowTitle: string) {
    return this.getRowByTitle(rowTitle).getByTestId('manageIntegrationActionsBtn');
  }

  async openActionsMenu(rowTitle: string) {
    await this.getActionsButton(rowTitle).click();
  }

  getReviewApproveMenuItem() {
    return this.page.testSubj.locator('manageIntegrationReviewApproveMenuItem');
  }

  getInstallMenuItem() {
    return this.page.testSubj.locator('manageIntegrationInstallMenuItem');
  }

  getDownloadZipMenuItem() {
    return this.page.testSubj.locator('manageIntegrationDownloadZipMenuItem');
  }

  getEditMenuItem() {
    return this.page.testSubj.locator('manageIntegrationEditMenuItem');
  }

  getDeleteMenuItem() {
    return this.page.testSubj.locator('manageIntegrationDeleteMenuItem');
  }

  getDeleteConfirmButton() {
    return this.page.getByTestId('confirmModalConfirmButton');
  }

  getDeleteCancelButton() {
    return this.page.getByTestId('confirmModalCancelButton');
  }

  getReviewApproveModal() {
    return this.page.getByRole('dialog', { name: 'Review and approve data streams dialog' });
  }

  getReviewApproveDeployButton() {
    return this.page.testSubj.locator('manageIntegrationReviewApproveDeployButton');
  }

  getReviewModalCancelButton() {
    return this.page.testSubj.locator('manageIntegrationReviewModalCancel');
  }

  getReviewModalVersionInput() {
    return this.page.getByLabel('Version');
  }

  getReviewModalCategoriesComboBox() {
    return this.page.testSubj.locator('manageIntegrationReviewModalCategories');
  }

  getActionsFilterButton() {
    return this.page.testSubj.locator('manageIntegrationsActionsFilterBtn');
  }

  getStatusFilterButton() {
    return this.page.testSubj.locator('manageIntegrationsStatusFilterBtn');
  }

  getBulkDeleteButton() {
    return this.page.testSubj.locator('manageIntegrationsBulkDeleteBtn');
  }

  getBulkInstallButton() {
    return this.page.testSubj.locator('manageIntegrationsBulkInstallBtn');
  }

  getRowCheckbox(rowTitle: string) {
    return this.getRowByTitle(rowTitle).locator('input[type="checkbox"]');
  }

  getTitleLink(title: string) {
    return this.getRowByTitle(title).getByRole('link', { name: title });
  }
}
