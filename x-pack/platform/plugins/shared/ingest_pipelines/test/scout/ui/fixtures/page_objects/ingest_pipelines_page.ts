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
  private readonly createPipelineDropdown: Locator;
  private readonly createNewPipelineButton: Locator;
  private readonly createPipelineFromCsvButton: Locator;
  private readonly nameFieldInput: Locator;
  private readonly descriptionField: Locator;
  private readonly versionToggle: Locator;
  private readonly versionFieldInput: Locator;
  private readonly submitButton: Locator;
  private readonly fileInput: Locator;
  private readonly processFileButton: Locator;
  private readonly continueToCreateButton: Locator;
  private readonly pipelineTableRows: Locator;
  private readonly pipelineTableRowNames: Locator;
  private readonly pipelineTableSearch: Locator;
  private readonly flyoutCloseButton: Locator;
  private readonly detailsPanelTitle: Locator;
  private readonly tablePaginationPopoverButton: Locator;
  private readonly tablePagination50Rows: Locator;
  private readonly logo: Locator;
  private readonly filtersDropdown: Locator;
  private readonly managedFilter: Locator;
  private readonly actionsPopoverButton: Locator;
  private readonly deletePipelineButton: Locator;
  private readonly manageProcessorsLink: Locator;
  private readonly manageProcessorsTitle: Locator;
  private readonly addGeoipDatabaseButton: Locator;
  private readonly databaseTypeSelect: Locator;
  private readonly databaseNameSelect: Locator;
  private readonly maxmindField: Locator;
  private readonly addGeoipDatabaseSubmitButton: Locator;
  private readonly geoipDatabaseListRows: Locator;
  private readonly geoipDatabaseConfirmation: Locator;
  private readonly deleteGeoipDatabaseSubmitButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.appTitle = this.page.testSubj.locator('appTitle');
    this.detailsFlyout = this.page.testSubj.locator('pipelineDetails');
    this.pipelineTreePanel = this.page.testSubj.locator('pipelineTreePanel');
    this.navigationBlockConfirmModal = this.page.testSubj.locator('navigationBlockConfirmModal');
    this.geoipEmptyListPrompt = this.page.testSubj.locator('geoipEmptyListPrompt');
    this.deleteManagedAssetsCallout = this.page.testSubj.locator('deleteManagedAssetsCallout');
    this.createPipelineDropdown = this.page.testSubj.locator('createPipelineDropdown');
    this.createNewPipelineButton = this.page.testSubj.locator('createNewPipeline');
    this.createPipelineFromCsvButton = this.page.testSubj.locator('createPipelineFromCsv');
    this.nameFieldInput = this.page.testSubj.locator('nameField').locator('input');
    this.descriptionField = this.page.testSubj.locator('descriptionField');
    this.versionToggle = this.page.testSubj.locator('versionToggle');
    this.versionFieldInput = this.page.testSubj.locator('versionField').locator('input');
    this.submitButton = this.page.testSubj.locator('submitButton');
    this.fileInput = this.page.locator('input[type="file"]');
    this.processFileButton = this.page.testSubj.locator('processFileButton');
    this.continueToCreateButton = this.page.testSubj.locator('continueToCreate');
    this.pipelineTableRows = this.page.testSubj.locator('pipelineTableRow');
    this.pipelineTableRowNames = this.page.testSubj.locator('pipelineTableRow-name');
    this.pipelineTableSearch = this.page.testSubj.locator('pipelineTableSearch');
    this.flyoutCloseButton = this.page.testSubj.locator('euiFlyoutCloseButton');
    this.detailsPanelTitle = this.page.testSubj.locator('detailsPanelTitle');
    this.tablePaginationPopoverButton = this.page.testSubj.locator('tablePaginationPopoverButton');
    this.tablePagination50Rows = this.page.testSubj.locator('tablePagination-50-rows');
    this.logo = this.page.testSubj.locator('logo');
    this.filtersDropdown = this.page.testSubj.locator('filtersDropdown');
    this.managedFilter = this.page.testSubj.locator('managedFilter');
    this.actionsPopoverButton = this.page.testSubj.locator('actionsPopoverButton');
    this.deletePipelineButton = this.page.testSubj.locator('deletePipelineButton');
    this.manageProcessorsLink = this.page.testSubj.locator('manageProcessorsLink');
    this.manageProcessorsTitle = this.page.testSubj.locator('manageProcessorsTitle');
    this.addGeoipDatabaseButton = this.page.testSubj.locator('addGeoipDatabaseButton');
    this.databaseTypeSelect = this.page.testSubj.locator('databaseTypeSelect');
    this.databaseNameSelect = this.page.testSubj.locator('databaseNameSelect');
    this.maxmindField = this.page.testSubj.locator('maxmindField');
    this.addGeoipDatabaseSubmitButton = this.page.testSubj.locator('addGeoipDatabaseSubmit');
    this.geoipDatabaseListRows = this.page.testSubj.locator('geoipDatabaseListRow');
    this.geoipDatabaseConfirmation = this.page.testSubj.locator('geoipDatabaseConfirmation');
    this.deleteGeoipDatabaseSubmitButton = this.page.testSubj.locator('deleteGeoipDatabaseSubmit');
  }

  async goto() {
    await this.page.gotoApp('management/ingest/ingest_pipelines');
    await this.appTitle.waitFor();
  }

  async sectionHeadingText() {
    return await this.appTitle.textContent();
  }

  async createNewPipeline({ name, description, version }: PipelineForm) {
    await this.createPipelineDropdown.click();
    await this.createNewPipelineButton.click();
    await this.nameFieldInput.fill(name);
    await this.fillDescription(description);

    if (version) {
      await this.versionToggle.click();
      await this.versionFieldInput.fill(version.toString());
    }

    await this.submitButton.click();
    await this.detailsFlyout.waitFor();
  }

  async createPipelineFromCsv({ name }: { name: string }) {
    await this.createPipelineDropdown.click();
    await this.createPipelineFromCsvButton.click();

    await this.fileInput.setInputFiles(
      path.join(
        process.cwd(),
        'x-pack/platform/test/functional/fixtures/ingest_pipeline_example_mapping.csv'
      )
    );

    await this.processFileButton.click();
    await this.continueToCreateButton.click();
    await this.nameFieldInput.fill(name);
    await this.submitButton.click();
    await this.detailsFlyout.waitFor();
  }

  async getPipelinesList(options?: { searchFor?: string }) {
    if (options?.searchFor) {
      await this.searchPipelineList(options.searchFor);
    }

    const pipelineNames = await this.pipelineTableRowNames.allTextContents();
    return pipelineNames.map((name) => name.replaceAll('↦', '').trim()).filter(Boolean);
  }

  async searchPipelineList(searchTerm: string) {
    await this.pipelineTableSearch.fill(searchTerm);
    await this.pipelineTableSearch.press('Enter');
  }

  async openPipelineDetailsByName(pipelineName: string) {
    await this.searchPipelineList(pipelineName);
    const row = this.pipelineTableRows.filter({ hasText: pipelineName });
    await row.waitFor();
    await row.locator('[data-test-subj="pipelineDetailsLink"]').click();
    await this.waitForDetailsFlyoutTitle(pipelineName);
  }

  async closePipelineDetailsFlyout() {
    await this.flyoutCloseButton.click();
  }

  async getDetailsFlyoutTitle() {
    return await this.detailsPanelTitle.textContent();
  }

  async waitForDetailsFlyoutTitle(expectedTitle: string) {
    await this.detailsPanelTitle.filter({ hasText: expectedTitle }).waitFor();
  }

  treeNode(pipeline: string) {
    return this.page.testSubj.locator(`pipelineTreeNode-${pipeline}`);
  }

  async clickTreeNode(pipeline: string) {
    await this.page.testSubj.locator(`pipelineTreeNode-${pipeline}-link`).click();
  }

  async increasePipelineListPageSize() {
    await this.tablePaginationPopoverButton.click();
    await this.tablePagination50Rows.click();
  }

  async dirtyCreateFormAndClickLogo() {
    await this.createPipelineDropdown.click();
    await this.createNewPipelineButton.click();
    await this.nameFieldInput.fill('test_name');
    await this.fillDescription('test_description');
    await this.logo.click();
  }

  async filterByManaged() {
    await this.filtersDropdown.click();
    await this.managedFilter.click();
  }

  async clickDeletePipelineAction() {
    await this.actionsPopoverButton.click();
    await this.deletePipelineButton.click();
  }

  async navigateToManageProcessorsPage() {
    await this.manageProcessorsLink.click();
    await this.manageProcessorsTitle.waitFor();
  }

  async openCreateDatabaseModal() {
    await this.addGeoipDatabaseButton.click();
  }

  async fillAddDatabaseForm(databaseType: string, databaseName: string, maxmind?: string) {
    await this.databaseTypeSelect.selectOption(databaseType);
    await this.databaseNameSelect.waitFor();

    if (maxmind) {
      await this.maxmindField.fill(maxmind);
    }

    await this.databaseNameSelect.selectOption(databaseName);
  }

  async clickAddDatabaseButton() {
    await this.addGeoipDatabaseSubmitButton.click();
  }

  async getGeoipDatabases() {
    return await this.geoipDatabaseListRows.allInnerTexts();
  }

  async deleteDatabaseByName(databaseName: string) {
    const row = this.geoipDatabaseListRows.filter({ hasText: databaseName });
    await row.waitFor();
    await row.locator('[data-test-subj="deleteGeoipDatabaseButton"]').click();
    await this.geoipDatabaseConfirmation.fill('delete');
    await this.deleteGeoipDatabaseSubmitButton.click();
  }

  private async fillDescription(description: string) {
    const descriptionTextArea = this.descriptionField.locator('textarea');
    if (await descriptionTextArea.count()) {
      await descriptionTextArea.fill(description);
    } else {
      await this.descriptionField.locator('input').fill(description);
    }
  }
}
