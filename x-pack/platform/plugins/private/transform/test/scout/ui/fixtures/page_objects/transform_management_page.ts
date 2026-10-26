/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export type TransformRowAction =
  | 'Clone'
  | 'Delete'
  | 'Discover'
  | 'Edit'
  | 'Reauthorize'
  | 'Reset'
  | 'Start'
  | 'Stop';

export type TransformRowColumn = 'Id' | 'Description' | 'Type' | 'Status' | 'Mode';

export type ExpandedRowTab = 'Details' | 'Stats' | 'Json' | 'Health' | 'Messages' | 'Preview';

export type TransformModal = 'Delete' | 'Reauthorize' | 'Reset' | 'Start';

const EXPANDED_ROW_TAB_CONTENT: Record<Exclude<ExpandedRowTab, 'Preview'>, string> = {
  Details: 'transformDetailsTabContent',
  Stats: 'transformStatsTabContent',
  Json: 'transformJsonTabContent',
  Health: 'transformHealthTabContent',
  Messages: 'transformMessagesTabContent',
};

export class TransformManagementPage {
  public readonly listPage: Locator;
  public readonly statsBar: Locator;
  public readonly createButton: Locator;
  public readonly createPage: Locator;
  public readonly listTable: Locator;
  public readonly reauthorizeCallout: Locator;
  public readonly rowActions: Locator;
  public readonly expandedRow: Locator;
  public readonly healthIssueTable: Locator;
  public readonly editFlyout: Locator;
  public readonly editFlyoutIngestPipelineSelect: Locator;
  public readonly editFlyoutRetentionPolicySwitch: Locator;
  public readonly editFlyoutUpdateButton: Locator;
  public readonly globalSearchResultLabels: Locator;

  constructor(private readonly page: ScoutPage) {
    this.listPage = page.getByTestId('transformPageTransformList');
    this.statsBar = page.getByTestId('transformStatsBar');
    this.createButton = page.getByTestId('transformButtonCreate');
    this.createPage = page.getByTestId('transformPageCreateTransform');
    this.listTable = page.getByTestId(/^transformListTable /);
    this.reauthorizeCallout = page.getByTestId('transformPageReauthorizeCallout');
    this.rowActions = page.getByTestId(/^transformAction/);
    this.expandedRow = page.getByTestId('transformExpandedRowTabbedContent');
    this.healthIssueTable = page.getByTestId('transformHealthTabContentIssueTable');
    this.editFlyout = page.getByTestId('transformEditFlyout');
    this.editFlyoutIngestPipelineSelect = page.getByTestId(
      'transformEditFlyoutDestinationIngestPipelineFieldSelect'
    );
    this.editFlyoutRetentionPolicySwitch = page.getByTestId('transformEditRetentionPolicySwitch');
    this.editFlyoutUpdateButton = page.getByTestId('transformEditFlyoutUpdateButton');
    this.globalSearchResultLabels = page
      .getByTestId('globalSearchModal')
      .getByTestId('nav-search-option');
  }

  async goto() {
    await this.page.gotoApp('management/data/transform');
    await this.listPage.waitFor({ state: 'visible' });
  }

  async waitForTableLoaded() {
    await this.page.getByTestId('transformListTable loaded').waitFor({ state: 'visible' });
  }

  async refreshList() {
    await this.page.getByTestId(/^transformRefreshTransformListButton/).click();
    await this.page
      .getByTestId('transformRefreshTransformListButton loaded')
      .waitFor({ state: 'visible' });
    await this.waitForTableLoaded();
  }

  async filterByTransformId(transformId: string) {
    await this.waitForTableLoaded();
    const searchInput = this.page.getByTestId('transformListTableContainer').getByRole('searchbox');
    await searchInput.fill(transformId);
    await searchInput.press('Enter');
    await this.getRow(transformId).waitFor({ state: 'visible' });
  }

  getRow(transformId: string): Locator {
    return this.page.getByTestId(`transformListRow row-${transformId}`);
  }

  getRowCell(transformId: string, column: TransformRowColumn): Locator {
    // The description is rendered under the id in the ID column, not in a column of its own.
    return this.getRow(transformId).getByTestId(
      column === 'Description'
        ? 'transformListColumnDescriptionText'
        : `transformListColumn${column}`
    );
  }

  getRowProgress(transformId: string): Locator {
    return this.getRow(transformId).getByTestId('transformListProgress');
  }

  getRowHealth(transformId: string): Locator {
    return this.getRow(transformId).getByTestId('transformListHealth');
  }

  getRowAction(action: TransformRowAction): Locator {
    return this.page.getByTestId(`transformAction${action}`);
  }

  async openRowActions(transformId: string) {
    await this.getRow(transformId).getByTestId('euiCollapsedItemActionsButton').click();
    await this.getRowAction('Delete').waitFor({ state: 'visible' });
  }

  // The actions button toggles the menu; Escape only closes it while focus is inside the popover.
  async closeRowActions(transformId: string) {
    await this.getRow(transformId).getByTestId('euiCollapsedItemActionsButton').click();
    await this.getRowAction('Delete').waitFor({ state: 'hidden' });
  }

  async clickRowAction(transformId: string, action: TransformRowAction) {
    await this.openRowActions(transformId);
    await this.getRowAction(action).click();
    await this.getRowAction(action).waitFor({ state: 'hidden' });
  }

  getModal(modal: TransformModal): Locator {
    return this.page.getByTestId(`transform${modal}Modal`);
  }

  async confirmModal(modal: TransformModal) {
    await this.getModal(modal).getByTestId('confirmModalConfirmButton').click();
    await this.getModal(modal).waitFor({ state: 'hidden' });
  }

  async expandRow(transformId: string) {
    await this.getRow(transformId).getByTestId('transformListRowDetailsToggle').click();
    await this.expandedRow.waitFor({ state: 'visible' });
  }

  getExpandedRowTabContent(tab: ExpandedRowTab): Locator {
    // The preview renders its data-test-subj twice when it shows an error (e.g. no source access).
    return tab === 'Preview'
      ? this.expandedRow.getByRole('tabpanel')
      : this.expandedRow.getByTestId(EXPANDED_ROW_TAB_CONTENT[tab]);
  }

  async openExpandedRowTab(tab: ExpandedRowTab) {
    await this.expandedRow.getByTestId(`transform${tab}Tab`).click();
    await this.getExpandedRowTabContent(tab).waitFor({ state: 'visible' });
  }

  async openEditFlyout(transformId: string) {
    await this.clickRowAction(transformId, 'Edit');
    await this.editFlyout.waitFor({ state: 'visible' });
  }

  getEditFlyoutInput(input: string): Locator {
    return this.page.getByTestId(`transformEditFlyout${input}Input`);
  }

  async openEditFlyoutAccordion(accordion: 'Destination' | 'AdvancedSettings') {
    await this.page.getByTestId(`transformEditAccordion${accordion}`).click();
    await this.page
      .getByTestId(`transformEditAccordion${accordion}Content`)
      .waitFor({ state: 'visible' });
  }

  /** Deep link used to create a transform from a saved search. */
  async gotoCreateTransform(savedObjectId: string, transformFunction: 'pivot' | 'latest') {
    await this.page.gotoApp(`management/data/transform/create_transform/${savedObjectId}`, {
      params: { transformFunction },
    });
    await this.createPage.waitFor({ state: 'visible' });
  }

  async startTransformCreation(transformFunction: 'pivot' | 'latest') {
    await this.createButton.click();
    await this.page.getByTestId('transformCreatePopover').waitFor({ state: 'visible' });
    await this.page
      .getByTestId(
        transformFunction === 'latest'
          ? 'transformCreateLatestButton'
          : 'transformCreatePivotButton'
      )
      .click();
    await this.createPage.waitFor({ state: 'visible' });
  }

  async selectSource(dataViewTitle: string) {
    await this.page.getByTestId('transformDataViewPicker').click();
    const switcher = this.page.getByTestId('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.getByTestId('indexPattern-switcher--input').fill(dataViewTitle);
    await switcher.getByTestId(`dataView-${dataViewTitle}`).click();
    await switcher.waitFor({ state: 'hidden' });
  }

  async searchGlobally(term: string) {
    await this.page.getByTestId('kbnChromeHeader-searchButton').click();
    await this.page.getByTestId('globalSearchModal').waitFor({ state: 'visible' });
    await this.page.getByTestId('nav-search-input').fill(term);
  }
}
