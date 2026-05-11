/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import path from 'path';

interface PipelineForm {
  name: string;
  description: string;
  version?: number;
}

export class IngestPipelinesPage {
  public readonly appTitle: Locator;
  public readonly detailsFlyout: Locator;
  public readonly pipelineTreePanel: Locator;
  public readonly navigationBlockConfirmModal: Locator;
  public readonly geoipEmptyListPrompt: Locator;
  public readonly deleteManagedAssetsCallout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.appTitle = this.page.testSubj.locator('appTitle');
    this.detailsFlyout = this.page.testSubj.locator('pipelineDetails');
    this.pipelineTreePanel = this.page.testSubj.locator('pipelineTreePanel');
    this.navigationBlockConfirmModal = this.page.testSubj.locator('navigationBlockConfirmModal');
    this.geoipEmptyListPrompt = this.page.testSubj.locator('geoipEmptyListPrompt');
    this.deleteManagedAssetsCallout = this.page.testSubj.locator('deleteManagedAssetsCallout');
  }

  async goto() {
    await this.page.gotoApp('management/ingest/ingest_pipelines');
    await this.appTitle.waitFor();
  }

  async sectionHeadingText() {
    return await this.appTitle.textContent();
  }

  async createNewPipeline({ name, description, version }: PipelineForm) {
    await this.page.testSubj.locator('createPipelineDropdown').click();
    await this.page.testSubj.locator('createNewPipeline').click();
    await this.page.testSubj.locator('nameField').locator('input').fill(name);
    const descriptionField = this.page.testSubj.locator('descriptionField');
    const descriptionTextArea = descriptionField.locator('textarea');
    if (await descriptionTextArea.count()) {
      await descriptionTextArea.fill(description);
    } else {
      await descriptionField.locator('input').fill(description);
    }

    if (version) {
      await this.page.testSubj.locator('versionToggle').click();
      await this.page.testSubj.locator('versionField').locator('input').fill(version.toString());
    }

    await this.page.testSubj.locator('submitButton').click();
    await this.detailsFlyout.waitFor();
  }

  async createPipelineFromCsv({ name }: { name: string }) {
    await this.page.testSubj.locator('createPipelineDropdown').click();
    await this.page.testSubj.locator('createPipelineFromCsv').click();

    await this.page
      .locator('input[type="file"]')
      .setInputFiles(
        path.join(
          process.cwd(),
          'x-pack/platform/test/functional/fixtures/ingest_pipeline_example_mapping.csv'
        )
      );

    await this.page.testSubj.locator('processFileButton').click();
    await this.page.testSubj.locator('continueToCreate').click();
    await this.page.testSubj.locator('nameField').locator('input').fill(name);
    await this.page.testSubj.locator('submitButton').click();
    await this.detailsFlyout.waitFor();
  }

  async getPipelinesList(options?: { searchFor?: string }) {
    if (options?.searchFor) {
      await this.searchPipelineList(options.searchFor);
    }

    const pipelineNames = await this.page.testSubj
      .locator('pipelineTableRow-name')
      .allTextContents();
    return pipelineNames.map((name) => name.replaceAll('↦', '').trim()).filter(Boolean);
  }

  async searchPipelineList(searchTerm: string) {
    const input = this.page.testSubj.locator('pipelineTableSearch');
    await input.fill(searchTerm);
    await input.press('Enter');
  }

  async openPipelineDetailsByName(pipelineName: string) {
    await this.searchPipelineList(pipelineName);
    const row = this.page.testSubj.locator('pipelineTableRow').filter({ hasText: pipelineName });
    await row.waitFor();
    await row.locator('[data-test-subj="pipelineDetailsLink"]').click();
    await this.waitForDetailsFlyoutTitle(pipelineName);
  }

  async closePipelineDetailsFlyout() {
    await this.page.testSubj.locator('euiFlyoutCloseButton').click();
  }

  async getDetailsFlyoutTitle() {
    return await this.page.testSubj.locator('detailsPanelTitle').textContent();
  }

  async waitForDetailsFlyoutTitle(expectedTitle: string) {
    await this.page.testSubj
      .locator('detailsPanelTitle')
      .filter({ hasText: expectedTitle })
      .waitFor();
  }

  treeNode(pipeline: string) {
    return this.page.testSubj.locator(`pipelineTreeNode-${pipeline}`);
  }

  async clickTreeNode(pipeline: string) {
    await this.page.testSubj.locator(`pipelineTreeNode-${pipeline}-link`).click();
  }

  async increasePipelineListPageSize() {
    await this.page.testSubj.locator('tablePaginationPopoverButton').click();
    await this.page.testSubj.locator('tablePagination-50-rows').click();
  }

  async dirtyCreateFormAndClickLogo() {
    await this.page.testSubj.locator('createPipelineDropdown').click();
    await this.page.testSubj.locator('createNewPipeline').click();
    await this.page.testSubj.locator('nameField').locator('input').fill('test_name');
    const descriptionField = this.page.testSubj.locator('descriptionField');
    const descriptionTextArea = descriptionField.locator('textarea');
    if (await descriptionTextArea.count()) {
      await descriptionTextArea.fill('test_description');
    } else {
      await descriptionField.locator('input').fill('test_description');
    }
    await this.page.testSubj.locator('logo').click();
  }

  async filterByManaged() {
    await this.page.testSubj.locator('filtersDropdown').click();
    await this.page.testSubj.locator('managedFilter').click();
  }

  async openFirstPipelineDetails() {
    const firstRow = this.page.testSubj.locator('pipelineTableRow').first();
    await firstRow.waitFor();
    await firstRow.locator('[data-test-subj="pipelineDetailsLink"]').click();
    await this.detailsFlyout.waitFor();
  }

  async clickDeletePipelineAction() {
    await this.page.testSubj.locator('actionsPopoverButton').click();
    await this.page.testSubj.locator('deletePipelineButton').click();
  }

  async navigateToManageProcessorsPage() {
    await this.page.testSubj.locator('manageProcessorsLink').click();
    await this.page.testSubj.locator('manageProcessorsTitle').waitFor();
  }

  async openCreateDatabaseModal() {
    await this.page.testSubj.locator('addGeoipDatabaseButton').click();
  }

  async fillAddDatabaseForm(databaseType: string, databaseName: string, maxmind?: string) {
    await this.page.testSubj.locator('databaseTypeSelect').selectOption(databaseType);
    await this.page.testSubj.locator('databaseNameSelect').waitFor();

    if (maxmind) {
      await this.page.testSubj.fill('maxmindField', maxmind);
    }

    await this.page.testSubj.locator('databaseNameSelect').selectOption(databaseName);
  }

  async clickAddDatabaseButton() {
    await this.page.testSubj.locator('addGeoipDatabaseSubmit').click();
  }

  async getGeoipDatabases() {
    return await this.page.testSubj.locator('geoipDatabaseListRow').allInnerTexts();
  }

  async deleteDatabaseByName(databaseName: string) {
    const row = this.page.testSubj
      .locator('geoipDatabaseListRow')
      .filter({ hasText: databaseName });
    await row.waitFor();
    await row.locator('[data-test-subj="deleteGeoipDatabaseButton"]').click();
    await this.page.testSubj.fill('geoipDatabaseConfirmation', 'delete');
    await this.page.testSubj.locator('deleteGeoipDatabaseSubmit').click();
  }
}
