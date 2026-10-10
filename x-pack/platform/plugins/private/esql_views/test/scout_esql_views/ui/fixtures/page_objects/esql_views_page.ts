/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

const ESQL_VIEW_QUERY_EDITOR = 'esqlViewQueryEditor';

export class EsqlViewsPage {
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly reloadButton: Locator;
  readonly createButton: Locator;
  readonly formFlyout: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly deleteModal: Locator;
  readonly noSearchResults: Locator;
  readonly managementNavigationLink: Locator;
  readonly managementLandingHeading: Locator;
  readonly previewResultsAccordion: Locator;
  readonly previewGrid: Locator;
  readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.table = page.testSubj.locator('esqlViewsTable');
    this.searchInput = page.testSubj.locator('esqlViewsSearch');
    this.reloadButton = page.testSubj.locator('esqlViewsReloadButton');
    this.createButton = page.testSubj.locator('esqlViewsCreateButton');
    this.formFlyout = page.testSubj.locator('esqlViewFormFlyout');
    this.nameInput = page.testSubj.locator('esqlViewNameInput');
    this.descriptionInput = page.testSubj.locator('esqlViewDescriptionInput');
    this.saveButton = page.testSubj.locator('esqlViewSaveButton');
    this.deleteModal = page.testSubj.locator('esqlViewsDeleteConfirmModal');
    this.noSearchResults = page.testSubj.locator('esqlViewsNoSearchResults');
    this.managementNavigationLink = page.testSubj.locator('esql_views');
    this.managementLandingHeading = page.getByRole('heading', {
      name: /Welcome to Stack Management/,
    });
    this.previewResultsAccordion = page.testSubj.locator('esqlViewPreviewResultsAccordion');
    this.previewGrid = page.testSubj.locator('discoverDocTable');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async gotoManagement(): Promise<void> {
    await this.page.gotoApp('management');
    await this.page.testSubj.locator('mgtSideBarNav').waitFor({ state: 'visible' });
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('management/data/esql_views');
    await this.table.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async gotoExpectUnavailable(): Promise<void> {
    await this.page.gotoApp('management/data/esql_views');
    await this.managementLandingHeading.waitFor({ state: 'visible' });
  }

  getViewRow(name: string): Locator {
    return this.table
      .getByRole('row')
      .filter({ has: this.page.getByRole('rowheader', { name, exact: true }) });
  }

  async search(value: string): Promise<void> {
    await this.searchInput.press('ControlOrMeta+A');
    await this.searchInput.press('Backspace');
    if (value) {
      await this.searchInput.pressSequentially(value);
    }
    await this.searchInput.press('Enter');
  }

  async reload(): Promise<void> {
    await this.reloadButton.click();
    await this.reloadButton.waitFor({ state: 'visible' });
  }

  async openCreateFlyout(): Promise<void> {
    await this.createButton.click();
    await this.formFlyout.waitFor();
  }

  async fillForm({
    name,
    description,
    query,
  }: {
    name?: string;
    description?: string;
    query: string;
  }): Promise<void> {
    if (name !== undefined) {
      await this.nameInput.fill(name);
    }
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }

    await this.codeEditor.waitCodeEditorReady(ESQL_VIEW_QUERY_EDITOR);
    await this.codeEditor.setCodeEditorValueByTestSubj(ESQL_VIEW_QUERY_EDITOR, query);
  }

  async saveForm(): Promise<void> {
    await this.saveButton.click();
  }

  async runPreview(): Promise<void> {
    await this.page.testSubj.click('ESQLEditor-run-query-button');
    await this.previewResultsAccordion
      .getByRole('button', { expanded: true })
      .waitFor({ state: 'visible' });
    await this.previewGrid
      .and(this.page.locator('[data-table-loaded="true"]'))
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openRowActions(name: string): Promise<void> {
    await this.getViewRow(name).getByTestId('esqlViewsActionsButton').click();
  }

  async openEditFlyout(name: string): Promise<void> {
    await this.openRowActions(name);
    await this.page.testSubj.click('esqlViewsEditButton');
    await this.formFlyout.waitFor();
  }

  async requestSingleDelete(name: string): Promise<void> {
    await this.openRowActions(name);
    await this.page.testSubj.click('esqlViewsDeleteButton');
    await this.deleteModal.waitFor();
  }

  async selectView(name: string): Promise<void> {
    await this.getViewRow(name).getByRole('checkbox').check();
  }

  async requestBulkDelete(): Promise<void> {
    await this.page.testSubj.click('esqlViewsBulkDeleteButton');
    await this.deleteModal.waitFor();
  }

  async confirmDelete(): Promise<void> {
    await this.deleteModal.getByRole('button', { name: 'Delete', exact: true }).click();
    await this.deleteModal.waitFor({ state: 'hidden' });
  }

  async openInDiscover(name: string): Promise<void> {
    await this.getViewRow(name).getByTestId('esqlViewsOpenInDiscoverAction').click();
  }
}
