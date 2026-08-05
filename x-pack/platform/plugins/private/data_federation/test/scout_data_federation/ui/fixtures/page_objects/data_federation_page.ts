/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

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
  readonly createDataSourceFlyoutS3Region;
  readonly createDataSourceFlyoutS3AccessKey;
  readonly createDataSourceFlyoutS3SecretKey;
  readonly createDataSourceFlyoutSubmit;
  readonly createDataSourceFlyoutSaveError;
  readonly editDataSourceFlyout;

  readonly createDataSetFlyout;
  readonly createDataSetFlyoutCancel;
  readonly createDataSetFlyoutDataSource;
  readonly createDataSetFlyoutName;
  readonly createDataSetFlyoutResource;
  readonly createDataSetFlyoutSettingsFormat;
  readonly createDataSetFlyoutSubmit;
  readonly createDataSetFlyoutSaveError;
  readonly editDataSetFlyout;

  constructor(private readonly page: ScoutPage) {
    this.pageTitle = page.testSubj.locator('dataSetsPageTitle');
    this.tabs = page.testSubj.locator('dataSetsTabs');
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
    this.createDataSourceFlyoutS3Region = page.testSubj.locator('createDataSourceFlyoutS3Region');
    this.createDataSourceFlyoutS3AccessKey = page.testSubj.locator(
      'createDataSourceFlyoutS3AccessKey'
    );
    this.createDataSourceFlyoutS3SecretKey = page.testSubj.locator(
      'createDataSourceFlyoutS3SecretKey'
    );
    this.createDataSourceFlyoutSubmit = page.testSubj.locator('createDataSourceFlyoutSubmit');
    this.createDataSourceFlyoutSaveError = page.testSubj.locator('createDataSourceFlyoutSaveError');
    this.editDataSourceFlyout = page.testSubj.locator('editDataSourceFlyout');

    this.createDataSetFlyout = page.testSubj.locator('createDatasetFlyout');
    this.createDataSetFlyoutCancel = page.testSubj.locator('createDatasetFlyoutCancel');
    this.createDataSetFlyoutDataSource = page.testSubj.locator('createDatasetFlyoutDataSource');
    this.createDataSetFlyoutName = page.testSubj.locator('createDatasetFlyoutName');
    this.createDataSetFlyoutResource = page.testSubj.locator('createDatasetFlyoutResource');
    this.createDataSetFlyoutSettingsFormat = page.testSubj.locator(
      'createDatasetFlyoutSettingsFormat'
    );
    this.createDataSetFlyoutSubmit = page.testSubj.locator('createDatasetFlyoutSubmit');
    this.createDataSetFlyoutSaveError = page.testSubj.locator('createDatasetFlyoutSaveError');
    this.editDataSetFlyout = page.testSubj.locator('editDatasetFlyout');
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
    await expect(modal).toBeVisible();
    await modal.locator('[data-test-subj="confirmModalConfirmButton"]').click();
    await expect(modal).toBeHidden();
  }

  async createS3DataSource({
    name,
    description,
    region,
    accessKey,
    secretKey,
  }: {
    name: string;
    description: string;
    region: string;
    accessKey: string;
    secretKey: string;
  }): Promise<void> {
    await this.connectDataSourceButton.click();
    await expect(this.createDataSourceFlyout).toBeVisible();

    await this.createDataSourceFlyoutName.fill(name);
    await this.createDataSourceFlyoutDescription.fill(description);
    await this.createDataSourceFlyoutS3Region.fill(region);
    await this.createDataSourceFlyoutS3AccessKey.fill(accessKey);
    await this.createDataSourceFlyoutS3SecretKey.fill(secretKey);

    await this.createDataSourceFlyoutSubmit.click();
    await expect(this.createDataSourceFlyoutSaveError).toHaveCount(0);
    await expect(this.createDataSourceFlyout).toBeHidden();
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
    await expect(this.editDataSourceFlyout).toBeVisible();

    await this.createDataSourceFlyoutDescription.fill(description);
    await this.createDataSourceFlyoutSubmit.click();

    await expect(this.editDataSourceFlyout).toBeHidden();
  }

  async deleteDataSource(dataSourceName: string): Promise<void> {
    const row = this.getDataSourceRow(dataSourceName);
    await row.locator('[data-test-subj="dataSetsDeleteIconButton"]').click();
    await this.confirmModalConfirm();
    await expect(row).toBeHidden();
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
    await expect(this.createDataSetButton).toBeEnabled();
    await this.createDataSetButton.click();
    await expect(this.createDataSetFlyout).toBeVisible();

    await this.createDataSetFlyoutDataSource.selectOption({ value: dataSourceName });
    await this.createDataSetFlyoutName.fill(name);
    await this.createDataSetFlyoutResource.fill(resource);
    await this.createDataSetFlyoutSettingsFormat.selectOption({ value: format });

    await this.createDataSetFlyoutSubmit.click();
    await expect(this.createDataSetFlyoutSaveError).toHaveCount(0);
    await expect(this.createDataSetFlyout).toBeHidden();
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
    await expect(this.editDataSetFlyout).toBeVisible();

    await this.createDataSetFlyoutResource.fill(resource);
    await this.createDataSetFlyoutSubmit.click();

    await expect(this.editDataSetFlyout).toBeHidden();
  }

  async deleteDataSet(dataSetName: string): Promise<void> {
    const row = this.getDataSetRow(dataSetName);
    await row.locator('[data-test-subj="dataSetsSetsDeleteIconButton"]').click();
    await this.confirmModalConfirm();
    await expect(row).toBeHidden();
  }
}
