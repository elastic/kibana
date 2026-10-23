/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { Locator, ScoutPage } from '@kbn/scout';

const REMOTE_CLUSTERS_PATH = 'management/data/remote_clusters';

export class RemoteClustersPage {
  readonly emptyPromptCreateButton: Locator;
  readonly tableCreateButton: Locator;
  readonly createButton: Locator;
  readonly pageTitle: Locator;
  readonly listTable: Locator;
  readonly deleteModalTitle: Locator;
  readonly deleteModalCancelButton: Locator;
  readonly detailsFlyoutTitle: Locator;
  readonly detailsProxyAddress: Locator;
  readonly requestButton: Locator;
  readonly requestFlyoutTitle: Locator;
  readonly closeFlyoutButton: Locator;
  readonly trustCertModeButton: Locator;
  readonly trustNextButton: Locator;
  readonly formNameInput: Locator;
  readonly formRemoteAddressInput: Locator;
  readonly formNextButton: Locator;
  readonly reviewNextButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.emptyPromptCreateButton = page.testSubj.locator('remoteClusterEmptyPromptCreateButton');
    this.tableCreateButton = page.testSubj.locator('remoteClusterCreateButton');
    // Create button is in the empty-state prompt with no clusters, or the app header with some
    // (mutually exclusive) — match whichever is present so the wizard is reachable either way.
    this.createButton = this.emptyPromptCreateButton.or(this.tableCreateButton);
    this.pageTitle = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.listTable = page.testSubj.locator('remoteClusterListTable');
    this.deleteModalTitle = page.testSubj.locator('confirmModalTitleText');
    this.deleteModalCancelButton = page.testSubj.locator('confirmModalCancelButton');
    this.detailsFlyoutTitle = page.testSubj.locator('remoteClusterDetailsFlyoutTitle');
    this.detailsProxyAddress = page.testSubj.locator('remoteClusterDetailProxyAddress');
    this.requestButton = page.testSubj.locator('remoteClustersRequestButton');
    this.requestFlyoutTitle = page.testSubj.locator('remoteClusterRequestFlyoutTitle');
    this.closeFlyoutButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.trustCertModeButton = page.testSubj.locator('setupTrustCertMode');
    this.trustNextButton = page.testSubj.locator('remoteClusterTrustNextButton');
    this.formNameInput = page.testSubj.locator('remoteClusterFormNameInput');
    this.formRemoteAddressInput = page.testSubj.locator('remoteClusterFormRemoteAddressInput');
    this.formNextButton = page.testSubj.locator('remoteClusterFormNextButton');
    this.reviewNextButton = page.testSubj.locator('remoteClusterReviewtNextButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(REMOTE_CLUSTERS_PATH);
  }

  // Match the single row by its exact cluster name so row actions/asserts stay correct when the
  // shared cluster has other remotes adding rows.
  clusterRow(name: string): Locator {
    return this.listTable
      .locator('tbody tr')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  clusterLink(name: string): Locator {
    return this.clusterRow(name).locator('[data-test-subj="remoteClustersTableListClusterLink"]');
  }

  async startAddWizard(): Promise<void> {
    await this.createButton.click();
    await this.trustNextButton.waitFor({ state: 'visible' });
  }

  // Certificate is the simpler trust mode — no API-key setup before the connection form.
  async completeTrustStepWithCert(): Promise<void> {
    await this.trustCertModeButton.click();
    await this.trustNextButton.click();
    await this.formNextButton.waitFor({ state: 'visible' });
  }

  async fillForm(name: string, remoteAddress: string): Promise<void> {
    await this.formNameInput.fill(name);
    await this.formRemoteAddressInput.fill(remoteAddress);
  }

  async goToReviewStep(): Promise<void> {
    await this.formNextButton.click();
    await this.reviewNextButton.waitFor({ state: 'visible' });
  }

  async submit(): Promise<void> {
    await this.reviewNextButton.click();
    await this.detailsFlyoutTitle.waitFor({ state: 'visible' });
  }

  async openRequestFlyout(): Promise<void> {
    await this.requestButton.click();
    await this.requestFlyoutTitle.waitFor({ state: 'visible' });
  }

  async closeFlyout(): Promise<void> {
    await this.closeFlyoutButton.click();
    await this.closeFlyoutButton.waitFor({ state: 'hidden' });
  }

  async openClusterDetails(name: string): Promise<void> {
    await this.clusterLink(name).click();
    await this.detailsFlyoutTitle.waitFor({ state: 'visible' });
  }

  async openDeleteModal(name: string): Promise<void> {
    await this.clusterRow(name)
      .locator('[data-test-subj="remoteClusterTableRowRemoveButton"]')
      .click();
    await this.deleteModalTitle.waitFor({ state: 'visible' });
  }

  async cancelDeleteModal(): Promise<void> {
    await this.deleteModalCancelButton.click();
    await this.deleteModalTitle.waitFor({ state: 'hidden' });
  }

  async openEditForm(name: string): Promise<void> {
    await this.clusterRow(name)
      .locator('[data-test-subj="remoteClusterTableRowEditButton"]')
      .click();
    // The edit form reuses the same page title element as the add wizard.
    await this.pageTitle.waitFor({ state: 'visible' });
  }
}
