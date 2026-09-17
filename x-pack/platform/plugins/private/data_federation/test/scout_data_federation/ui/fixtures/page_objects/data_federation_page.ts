/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class DataFederationPage {
  readonly pageTitle;
  readonly tabs;
  readonly dataSourcesTable;
  readonly dataSetsTable;
  readonly connectDataSourceButton;
  readonly createDataSetButton;

  readonly createDataSourceFlyoutType;
  readonly createDataSourceFlyout;
  readonly createDataSourceFlyoutCancel;
  readonly createDataSourceFlyoutName;
  readonly createDataSourceFlyoutDescription;
  readonly createDataSourceFlyoutS3AccessKey;
  readonly createDataSourceFlyoutS3SecretKey;
  readonly createDataSourceFlyoutSubmit;
  readonly createDataSourceFlyoutSaveError;
  readonly editDataSourceFlyout;

  readonly createDatasetWizard;
  readonly createDatasetWizardAdvancedStep;
  readonly createDatasetWizardReviewStep;
  readonly wizardNextButton;

  readonly createDataSetDataSource;
  readonly createDataSetName;
  readonly createDataSetResource;
  readonly createDataSetSettingsFormat;

  constructor(private readonly page: ScoutPage) {
    this.pageTitle = page.testSubj.locator('appHeaderTitle');
    this.tabs = page.testSubj.locator('appHeaderTabs');
    this.dataSourcesTable = page.testSubj.locator('dataSetsTable');
    this.dataSetsTable = page.testSubj.locator('dataSetsSetsTable');
    this.connectDataSourceButton = page.testSubj.locator('dataSetsCreateButton');
    this.createDataSetButton = page.testSubj.locator('dataSetsSetsCreateButton');

    this.createDataSourceFlyoutType = page.testSubj.locator('createDataSourceFlyoutType');
    this.createDataSourceFlyout = page.testSubj.locator('createDataSourceFlyout');
    this.createDataSourceFlyoutCancel = page.testSubj.locator('createDataSourceFlyoutCancel');
    this.createDataSourceFlyoutName = page.testSubj.locator('createDataSourceFlyoutName');
    this.createDataSourceFlyoutDescription = page.testSubj.locator(
      'createDataSourceFlyoutDescription'
    );
    this.createDataSourceFlyoutS3AccessKey = page.testSubj.locator(
      'createDataSourceFlyoutS3AccessKey'
    );
    this.createDataSourceFlyoutS3SecretKey = page.testSubj.locator(
      'createDataSourceFlyoutS3SecretKey'
    );
    this.createDataSourceFlyoutSubmit = page.testSubj.locator('createDataSourceFlyoutSubmit');
    this.createDataSourceFlyoutSaveError = page.testSubj.locator('createDataSourceFlyoutSaveError');
    this.editDataSourceFlyout = page.testSubj.locator('editDataSourceFlyout');

    this.createDatasetWizard = page.testSubj.locator('createDatasetWizard');
    this.createDatasetWizardAdvancedStep = page.testSubj.locator('createDatasetWizardAdvancedStep');
    this.createDatasetWizardReviewStep = page.testSubj.locator('createDatasetWizardReviewStep');
    this.wizardNextButton = page.testSubj.locator('nextButton');
    this.createDataSetDataSource = page.testSubj.locator('createDatasetDataSource');
    this.createDataSetName = page.testSubj.locator('createDatasetName');
    this.createDataSetResource = page.testSubj.locator('createDatasetResource');
    this.createDataSetSettingsFormat = page.testSubj.locator('createDatasetSettingsFormat');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('management');
    await this.page.testSubj.locator('data_federation').click();
    await this.pageTitle.waitFor({ state: 'visible' });
  }

  getDataSourceRow(dataSourceName: string) {
    return this.dataSourcesTable.locator('tr').filter({ hasText: dataSourceName });
  }

  getDataSetRow(dataSetName: string) {
    return this.dataSetsTable.locator('tr').filter({ hasText: dataSetName });
  }

  private getConfirmModal() {
    return this.page.getByRole('alertdialog');
  }

  async confirmModalConfirm(): Promise<void> {
    const modal = this.getConfirmModal();
    await modal.waitFor({ state: 'visible' });
    await modal.locator('[data-test-subj="confirmModalConfirmButton"]').click();
    await modal.waitFor({ state: 'hidden' });
  }

  async createS3DataSource({
    name,
    description,
    accessKey,
    secretKey,
  }: {
    name: string;
    description: string;
    accessKey: string;
    secretKey: string;
  }): Promise<void> {
    await this.connectDataSourceButton.click();
    await this.createDataSourceFlyout.waitFor({ state: 'visible' });

    await this.createDataSourceFlyoutName.fill(name);
    await this.createDataSourceFlyoutDescription.fill(description);
    await this.createDataSourceFlyoutS3AccessKey.fill(accessKey);
    await this.createDataSourceFlyoutS3SecretKey.fill(secretKey);

    await this.createDataSourceFlyoutSubmit.click();
    await this.createDataSourceFlyout.waitFor({ state: 'hidden' });
  }

  async editDataSourceDescription({
    dataSourceName,
    description,
  }: {
    dataSourceName: string;
    description: string;
  }): Promise<void> {
    const row = this.getDataSourceRow(dataSourceName);
    await row.locator('[data-test-subj="dataSetsEditButton"]').click();
    await this.editDataSourceFlyout.waitFor({ state: 'visible' });

    await this.createDataSourceFlyoutDescription.fill(description);
    await this.createDataSourceFlyoutSubmit.click();

    await this.editDataSourceFlyout.waitFor({ state: 'hidden' });
  }

  async deleteDataSource(dataSourceName: string): Promise<void> {
    const row = this.getDataSourceRow(dataSourceName);
    await row.locator('[data-test-subj="dataSetsDeleteIconButton"]').click();
    await this.confirmModalConfirm();
    await row.waitFor({ state: 'hidden' });
  }

  async createDataSet({
    dataSourceName,
    name,
    resource,
    format,
  }: {
    dataSourceName: string;
    name: string;
    resource: string;
    format: string;
  }): Promise<void> {
    await this.createDataSetButton.click();
    await this.createDatasetWizard.waitFor({ state: 'visible' });

    await this.createDataSetDataSource.click();
    await this.page.testSubj.locator(`createDatasetDataSource-${dataSourceName}`).click();
    await this.createDataSetName.fill(name);
    await this.createDataSetResource.fill(resource);
    await this.createDataSetSettingsFormat.selectOption({ value: format });

    await this.wizardNextButton.click();
    await this.createDatasetWizardAdvancedStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardReviewStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizard.waitFor({ state: 'hidden' });
  }

  async editDataSetResource({
    dataSetName,
    resource,
  }: {
    dataSetName: string;
    resource: string;
  }): Promise<void> {
    const row = this.getDataSetRow(dataSetName);
    await row.locator('[data-test-subj="dataSetsSetsEditButton"]').click();
    await this.createDatasetWizard.waitFor({ state: 'visible' });

    await this.createDataSetResource.fill(resource);
    await this.wizardNextButton.click();
    await this.createDatasetWizardAdvancedStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardReviewStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizard.waitFor({ state: 'hidden' });
  }

  async deleteDataSet(dataSetName: string): Promise<void> {
    const row = this.getDataSetRow(dataSetName);
    await row.locator('[data-test-subj="dataSetsSetsDeleteIconButton"]').click();
    await this.confirmModalConfirm();
    await row.waitFor({ state: 'hidden' });
  }
}
