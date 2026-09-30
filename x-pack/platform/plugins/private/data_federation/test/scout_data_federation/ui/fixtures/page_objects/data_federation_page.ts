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
  readonly createDatasetWizardAdditionalStep;
  readonly createDatasetWizardMappingStep;
  readonly createDatasetWizardReviewStep;
  readonly wizardNextButton;
  readonly wizardBackButton;
  readonly mappingFieldRows;

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
    this.createDatasetWizardAdditionalStep = page.testSubj.locator(
      'createDatasetWizardAdditionalStep'
    );
    this.createDatasetWizardMappingStep = page.testSubj.locator('createDatasetWizardMappingStep');
    this.createDatasetWizardReviewStep = page.testSubj.locator('createDatasetWizardReviewStep');
    this.wizardNextButton = page.testSubj.locator('nextButton');
    this.wizardBackButton = page.testSubj.locator('backButton');
    this.mappingFieldRows = page.testSubj.locator('dataFederationMappingEditorField');
    this.createDataSetDataSource = page.components.superSelect('createDatasetDataSource');
    this.createDataSetName = page.testSubj.locator('createDatasetName');
    this.createDataSetResource = page.testSubj.locator('createDatasetResource');
    this.createDataSetSettingsFormat = page.components.superSelect('createDatasetSettingsFormat');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('management');
    await this.page.testSubj.locator('data_federation').click();
    await this.pageTitle.waitFor({ state: 'visible' });
  }

  /** Selects the given app tab, clicking it only when it is not already the selected tab. */
  async selectTab(name: 'Datasets' | 'Data sources'): Promise<void> {
    const tab = this.page.getByRole('tab', { name, exact: true });
    await tab.waitFor({ state: 'visible' });
    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click();
    }
    await this.page.getByRole('tab', { name, exact: true, selected: true }).waitFor();
  }

  getDataSourceRow(dataSourceName: string) {
    return this.dataSourcesTable.locator('tr').filter({ hasText: dataSourceName });
  }

  getDataSetRow(dataSetName: string) {
    return this.dataSetsTable.locator('tr').filter({ hasText: dataSetName });
  }

  async filterDataSets(dataSetName: string): Promise<void> {
    await this.page.testSubj.locator('dataSetsSetsSearch').fill(`"${dataSetName}"`);
    await this.getDataSetRow(dataSetName).waitFor({ state: 'visible' });
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

    await this.createDataSetDataSource.selectOptionByValue(dataSourceName);
    await this.createDataSetName.fill(name);
    await this.createDataSetResource.fill(resource);
    await this.createDataSetSettingsFormat.selectOptionByValue(format);

    await this.wizardNextButton.click();
    await this.createDatasetWizardAdditionalStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardMappingStep.waitFor({ state: 'visible' });

    // Mapping step defaults to "Timeseries data" enabled (requires @timestamp source field path).
    await this.page.testSubj.locator('createDatasetWizardTimestampPath').fill('timestamp');

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
    await this.openDataSetActionsMenu(dataSetName);
    await this.clickDataSetActionsMenuItem('Edit');
    await this.createDatasetWizard.waitFor({ state: 'visible' });

    await this.createDataSetResource.fill(resource);
    await this.wizardNextButton.click();
    await this.createDatasetWizardAdditionalStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardMappingStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardReviewStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizard.waitFor({ state: 'hidden' });
  }

  getMappingFieldRow(fieldName: string) {
    return this.mappingFieldRows.filter({
      has: this.page.getByText(fieldName, { exact: true }),
    });
  }

  async openCreateDatasetWizardAtMapping({
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

    await this.createDataSetDataSource.selectOptionByValue(dataSourceName);
    await this.createDataSetName.fill(name);
    await this.createDataSetResource.fill(resource);
    await this.createDataSetSettingsFormat.selectOptionByValue(format);

    await this.wizardNextButton.click();
    await this.createDatasetWizardAdditionalStep.waitFor({ state: 'visible' });
    await this.wizardNextButton.click();
    await this.createDatasetWizardMappingStep.waitFor({ state: 'visible' });

    // Timeseries data is on by default and blocks Next until a source path is set.
    await this.page.testSubj.locator('createDatasetWizardTimestampPath').fill('timestamp');
  }

  async addMappingField(name: string): Promise<void> {
    await this.page.testSubj.locator('dataFederationMappingEditorAddField').click();
    await this.page.testSubj.locator('dataFederationMappingEditorFieldName').fill(name);
    await this.page.testSubj.locator('dataFederationMappingEditorDraftAddField').click();
    await this.getMappingFieldRow(name).waitFor({ state: 'visible' });
  }

  async goToDatasetReviewStep(): Promise<void> {
    await this.wizardNextButton.click();
    await this.createDatasetWizardReviewStep.waitFor({ state: 'visible' });
  }

  async goBackToDatasetMappingStep(): Promise<void> {
    await this.wizardBackButton.click();
    await this.createDatasetWizardMappingStep.waitFor({ state: 'visible' });
  }

  async removeMappingField(name: string): Promise<void> {
    await this.getMappingFieldRow(name)
      .locator('[data-test-subj="dataFederationMappingEditorRemoveField"]')
      .click();
    const modal = this.page.testSubj.locator('dataFederationMappingEditorConfirmRemoveFieldModal');
    await modal.waitFor({ state: 'visible' });
    await modal.locator('[data-test-subj="confirmModalConfirmButton"]').click();
    await modal.waitFor({ state: 'hidden' });
    await this.getMappingFieldRow(name).waitFor({ state: 'hidden' });
  }

  async openDataSetActionsMenu(dataSetName: string): Promise<void> {
    await this.getDataSetRow(dataSetName).getByRole('button', { name: 'More actions' }).click();
  }

  async clickDataSetActionsMenuItem(name: 'Edit' | 'Delete'): Promise<void> {
    await this.page
      .getByRole('dialog', { name: 'More actions' })
      .getByRole('menuitem', { name, exact: true })
      .click();
  }

  async deleteDataSet(dataSetName: string): Promise<void> {
    const row = this.getDataSetRow(dataSetName);
    await this.openDataSetActionsMenu(dataSetName);
    await this.clickDataSetActionsMenuItem('Delete');
    await this.confirmModalConfirm();
    await row.waitFor({ state: 'hidden' });
  }
}
