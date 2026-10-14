/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMenu,
  ContentListWrapper,
  type KibanaUrl,
  type Locator,
  type ScoutPage,
} from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const LISTING_TIMEOUT = 20_000;

export class GraphPage {
  /** Shared wrapper for the Content List listing UI (toolbar, table, selection bar). */
  readonly contentList: ContentListWrapper;
  private readonly appMenu: AppMenu;

  // Public locators consumed directly by specs.
  readonly createGraphPromptButton: Locator;
  readonly createGraphButton: Locator;
  readonly saveButton: Locator;
  readonly currentGraphBreadcrumb: Locator;
  readonly vennLargeTerm1: Locator;
  readonly vennLargeTerm2: Locator;
  readonly vennSmallTerm1: Locator;
  readonly vennSmallOverlap: Locator;
  readonly vennSmallTerm2: Locator;
  readonly nodeLabelInput: Locator;
  readonly rawDocumentsDrilldown: Locator;
  readonly inspectorRequestTab: Locator;
  readonly inspectorResponseTab: Locator;
  readonly datasourceButton: Locator;
  readonly queryInput: Locator;

  // Internal locators — consumed only by methods on this class.
  private readonly newButton: Locator;
  private readonly settingsButton: Locator;
  private readonly emptyState: Locator;
  private readonly addFieldButton: Locator;
  private readonly fieldSearchInput: Locator;
  private readonly exploreButton: Locator;
  private readonly selectAllButton: Locator;
  private readonly invertSelectionButton: Locator;
  private readonly removeSelectionButton: Locator;
  private readonly pauseLayoutButton: Locator;
  private readonly resumeLayoutButton: Locator;
  private readonly saveTitleInput: Locator;
  private readonly saveConfirmButton: Locator;
  private readonly saveSuccessToast: Locator;
  private readonly confirmModalTitle: Locator;
  private readonly confirmModalConfirmButton: Locator;
  private readonly nodeCircles: Locator;
  private readonly clickableEdges: Locator;
  private readonly selectionListFields: Locator;
  private readonly graphNodes: Locator;
  private readonly undoButton: Locator;
  private readonly redoButton: Locator;
  private readonly groupButton: Locator;
  private readonly ungroupButton: Locator;
  private readonly mergeLeftIntoRightButton: Locator;
  private readonly expandSelectionButton: Locator;
  private readonly fillConnectionsButton: Locator;
  private readonly blockSelectionButton: Locator;
  private readonly styleSelectionButton: Locator;
  private readonly drilldownButton: Locator;
  private readonly inspectButton: Locator;
  private readonly drilldownsSettingsTab: Locator;
  private readonly addDrilldownButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.contentList = new ContentListWrapper(page);
    this.appMenu = new AppMenu(page);
    this.createGraphPromptButton = this.page.getByTestId('graphCreateGraphPromptButton');
    this.createGraphButton = this.page.getByTestId('graphCreateGraphButton');

    this.newButton = this.page.getByTestId('graphNewButton');
    this.saveButton = this.page.getByTestId('graphSaveButton');
    this.settingsButton = this.page.getByTestId('graphSettingsButton');
    this.emptyState = this.page.getByTestId('content-list-emptyState');
    this.currentGraphBreadcrumb = this.page.getByTestId(/graphCurrentGraphBreadcrumb/);
    this.datasourceButton = this.page.getByTestId('graphDatasourceButton');
    this.addFieldButton = this.page.getByTestId('graph-add-field-button');
    this.fieldSearchInput = this.page.getByTestId('graph-field-search');
    this.exploreButton = this.page.getByTestId('graph-explore-button');
    this.queryInput = this.page.getByTestId('queryInput');

    this.selectAllButton = this.page.getByTestId('graphSelectAll');
    this.invertSelectionButton = this.page.getByTestId('graphInvertSelection');
    this.removeSelectionButton = this.page.getByTestId('graphRemoveSelection');
    this.pauseLayoutButton = this.page.getByTestId('graphPauseLayout');
    this.resumeLayoutButton = this.page.getByTestId('graphResumeLayout');

    this.saveTitleInput = this.page.getByTestId('savedObjectTitle');
    this.saveConfirmButton = this.page.getByTestId('confirmSaveSavedObjectButton');
    this.saveSuccessToast = this.page.getByTestId('saveGraphSuccess');

    this.confirmModalTitle = this.page.getByTestId('confirmModalTitleText');
    this.confirmModalConfirmButton = this.page.getByTestId('confirmModalConfirmButton');

    this.nodeCircles = this.page.getByTestId('graphNodeCircle');
    this.clickableEdges = this.page.getByTestId('graphClickableEdge');
    this.selectionListFields = this.page.getByTestId(/^graphSelectionListField-/);
    this.graphNodes = this.page.getByTestId('graphNode');
    this.undoButton = this.page.getByTestId('graphUndo');
    this.redoButton = this.page.getByTestId('graphRedo');
    this.groupButton = this.page.getByTestId('graphGroupSelection');
    this.ungroupButton = this.page.getByTestId('graphUngroupSelection');
    this.mergeLeftIntoRightButton = this.page.getByTestId('graphMergeLeftIntoRight');
    this.expandSelectionButton = this.page.getByTestId('graphExpandSelection');
    this.fillConnectionsButton = this.page.getByTestId('graphFillConnections');
    this.blockSelectionButton = this.page.getByTestId('graphBlockSelection');
    this.styleSelectionButton = this.page.getByTestId('graphStyleSelection');
    this.drilldownButton = this.page.getByTestId('graphDrilldown');
    this.inspectButton = this.page.getByTestId('graphInspectButton');
    this.drilldownsSettingsTab = this.page.getByTestId('drillDowns');
    this.addDrilldownButton = this.page.getByTestId('graphAddNewTemplate');
    this.nodeLabelInput = this.page.getByTestId('graphNodeLabelInput');
    this.rawDocumentsDrilldown = this.page.getByTestId('graphRawDocumentsDrilldown');
    this.inspectorRequestTab = this.page.getByRole('tab', { name: 'Request', exact: true });
    this.inspectorResponseTab = this.page.getByRole('tab', { name: 'Response', exact: true });

    this.vennLargeTerm1 = this.page.getByTestId('graphVennLargeTerm1');
    this.vennLargeTerm2 = this.page.getByTestId('graphVennLargeTerm2');
    this.vennSmallTerm1 = this.page.getByTestId('graphVennSmallTerm1');
    this.vennSmallOverlap = this.page.getByTestId('graphVennSmallOverlap');
    this.vennSmallTerm2 = this.page.getByTestId('graphVennSmallTerm2');
  }

  async goto() {
    await this.page.gotoApp('graph');
  }

  async gotoInSpace(spaceId: string) {
    await this.page.goto(this.kbnUrl.app('graph', { space: spaceId }));
  }

  async waitForListing() {
    // Empty prompt button lives inside `content-list-emptyState`; do not `.or()`
    // both or Playwright strict mode fails when the empty listing is ready.
    await this.emptyState
      .or(this.contentList.searchBox)
      .waitFor({ state: 'visible', timeout: LISTING_TIMEOUT });
  }

  async clickCreateGraph() {
    if (await this.createGraphPromptButton.isVisible()) {
      await this.createGraphPromptButton.click();
      return;
    }
    await this.appMenu.clickItem(this.createGraphButton);
  }

  /**
   * Wait for the workspace shell. The `Unsaved graph` breadcrumb appears
   * even without data-view access (the canvas is then replaced by a
   * "No data source" panel), so this is safe for read-only/security tests.
   */
  async waitForWorkspace() {
    await this.currentGraphBreadcrumb.waitFor({ state: 'visible' });
  }

  async pickIndexPattern(indexPattern: string) {
    await this.datasourceButton.click();
    await this.page.getByTestId(`savedObjectTitle${indexPattern}`).click();
    // EuiBadge is not a native control, so toBeEnabled() ignores its aria-disabled state.
    await expect(this.addFieldButton).toHaveAttribute('aria-disabled', 'false');
  }

  async pickIndexPatternByName(dataViewName: string) {
    await this.datasourceButton.click();
    await this.page
      .getByRole('dialog', { name: 'Select a data source' })
      .getByRole('button', { name: dataViewName, exact: true })
      .click();
    // EuiBadge is not a native control, so toBeEnabled() ignores its aria-disabled state.
    await expect(this.addFieldButton).toHaveAttribute('aria-disabled', 'false');
  }

  async changeIndexPatternByName(dataViewName: string) {
    await this.datasourceButton.click();
    await this.confirmModalConfirmButton.click();
    await this.page
      .getByRole('dialog', { name: 'Select a data source' })
      .getByRole('button', { name: dataViewName, exact: true })
      .click();
    // EuiBadge is not a native control, so toBeEnabled() ignores its aria-disabled state.
    await expect(this.addFieldButton).toHaveAttribute('aria-disabled', 'false');
  }

  async addFields(fields: string[]) {
    await this.addFieldButton.click();
    await this.fieldSearchInput.waitFor({ state: 'visible' });
    for (const field of fields) {
      await this.fieldSearchInput.fill(field);
      const option = this.page.getByTestId(`graph-field-option-${field}`);
      await option.waitFor({ state: 'visible' });
      await option.click();
    }
    await this.fieldSearchInput.fill('');
    await this.addFieldButton.click();
    await this.fieldSearchInput.waitFor({ state: 'hidden' });
  }

  async runQuery(query: string) {
    await this.queryInput.clear();
    await this.queryInput.pressSequentially(query);
    await this.exploreButton.click();
  }

  async createWorkspaceWithQuery({
    dataViewTitle,
    dataViewName,
    fields,
    query,
  }: {
    dataViewTitle: string;
    dataViewName?: string;
    fields: string[];
    query: string;
  }) {
    await this.goto();
    await this.waitForListing();
    await this.clickCreateGraph();
    await this.waitForWorkspace();
    if (dataViewName) {
      await this.pickIndexPatternByName(dataViewName);
    } else {
      await this.pickIndexPattern(dataViewTitle);
    }
    await this.addFields(fields);
    await this.runQuery(query);
    await expect.poll(() => this.nodeCount()).toBeGreaterThan(0);
  }

  node(label: string): Locator {
    return this.graphNodes.filter({ has: this.page.getByText(label, { exact: true }) });
  }

  /** Select nodes through the stable sidebar instead of moving D3 geometry. */
  async selectNodes(labels: string[]) {
    await this.selectAllButton.click();

    const PREFIX = 'graphSelectionListField-';
    const selectedLabels = await this.selectionListFields.evaluateAll(
      (elements, prefix) =>
        elements
          .map((element) => element.getAttribute('data-test-subj') ?? '')
          .map((testSubject) =>
            testSubject.startsWith(prefix) ? testSubject.slice(prefix.length) : null
          )
          .filter((label): label is string => label !== null),
      PREFIX
    );

    const labelsToKeep = new Set(labels);
    for (const selectedLabel of selectedLabels) {
      if (!labelsToKeep.has(selectedLabel)) {
        await this.page.getByTestId(`graph-selected-${selectedLabel}`).click();
      }
    }

    const focusedLabel = labels[labels.length - 1];
    if (focusedLabel) {
      await this.page
        .getByTestId(`graphSelectionListField-${focusedLabel}`)
        .getByText(focusedLabel, { exact: true })
        .click();
    }
  }

  async selectAllNodes() {
    await this.selectAllButton.click();
  }

  async groupSelection() {
    await this.groupButton.click();
  }

  async ungroupSelection() {
    await this.ungroupButton.click();
  }

  async mergeLeftIntoRight() {
    await this.mergeLeftIntoRightButton.click();
  }

  async undo() {
    await this.undoButton.click();
  }

  async redo() {
    await this.redoButton.click();
  }

  async expandSelection() {
    await this.expandSelectionButton.click();
  }

  async fillConnections() {
    await this.fillConnectionsButton.click();
  }

  async blockSelection() {
    await this.blockSelectionButton.click();
  }

  async setNodeLabel(label: string) {
    await this.nodeLabelInput.fill(label);
    await this.nodeLabelInput.press('Tab');
  }

  async selectNodeColor(color: string) {
    await this.styleSelectionButton.click();
    await this.page.getByTestId(`graphColorPicker-${color}`).click();
  }

  async openInspector() {
    await this.appMenu.clickItem(this.inspectButton);
  }

  async openDrilldowns() {
    await this.drilldownButton.click();
  }

  async createDrilldown({ title, url, encoder }: { title: string; url: string; encoder: string }) {
    await this.clickSettings();
    await this.drilldownsSettingsTab.click();
    await this.addDrilldownButton.click();

    const newDrilldown = this.page
      .getByTestId('graphSettingsFlyout')
      .getByRole('group', { name: 'New drilldown' });
    await newDrilldown.getByRole('textbox', { name: 'Title' }).fill(title);
    await newDrilldown.getByRole('textbox', { name: 'URL', exact: true }).fill(url);
    await this.page.components
      .comboBox('graphDrilldownEncoder', newDrilldown)
      .setSelectedOptions([encoder]);
    await newDrilldown.getByRole('button', { name: 'Save drilldown' }).click();
    await this.page.keyboard.press('Escape');
  }

  async openDrilldown(title: string) {
    const popupPromise = this.page.waitForEvent('popup');
    await this.page
      .getByTestId('graphDrilldowns')
      .getByRole('button', { name: title, exact: true })
      .click();
    const popup = await popupPromise;
    await popup.waitForURL((url) => url.toString() !== 'about:blank');
    await popup.getByTestId('discoverDocTable').waitFor({ state: 'visible' });
    return popup;
  }

  async saveWorkspace() {
    await this.appMenu.clickItem(this.saveButton);
    await this.saveConfirmButton.click();
    await this.saveSuccessToast.waitFor({ state: 'visible' });
  }

  async openHiddenList() {
    await this.clickSettings();
    await this.page.getByTestId('blocklist').click();
  }

  async unblockAllNodes() {
    await this.page.getByTestId('graphUnblocklistAll').click();
  }

  async saveWorkspaceAs(title: string) {
    await this.appMenu.clickItem(this.saveButton);
    await this.saveTitleInput.fill(title);
    await this.saveConfirmButton.click();
    await this.saveSuccessToast.waitFor({ state: 'visible' });
  }

  async clickSettings() {
    await this.appMenu.clickItem(this.settingsButton);
  }

  async newWorkspace({ discardChanges = false }: { discardChanges?: boolean } = {}) {
    await this.appMenu.clickItem(this.newButton);
    if (discardChanges) {
      await this.confirmModalTitle.waitFor({ state: 'visible' });
      await this.confirmModalConfirmButton.click();
    }
  }

  async goToListingViaBreadcrumb() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.goto();
  }

  async openWorkspace(title: string) {
    await this.workspaceListingLink(title).click();
  }

  async deleteWorkspace(title: string) {
    const rowLink = this.workspaceListingLink(title);
    await this.contentList.searchFor(title);
    await rowLink.waitFor({ state: 'visible' });
    await this.contentList.selectAllAndDelete();
    await rowLink.waitFor({ state: 'hidden', timeout: LISTING_TIMEOUT });
  }

  private workspaceListingLink(title: string): Locator {
    return this.contentList.itemLinks.filter({ hasText: title });
  }

  async nodeCount(): Promise<number> {
    return this.nodeCircles.count();
  }

  async edgeCount(): Promise<number> {
    return this.clickableEdges.count();
  }

  async selectionCount(): Promise<number> {
    return this.selectionListFields.count();
  }

  /**
   * Click the only remaining edge after `isolateEdge`. Dispatches a synthetic
   * SVG click — overlapping thin lines and SVG `pointer-events` make
   * Playwright's actionable click flaky here.
   */
  async clickIsolatedEdge() {
    await this.clickableEdges.evaluateAll((els) => {
      if (els.length !== 1) {
        throw new Error(`Expected exactly one isolated edge, found ${els.length}`);
      }
      (els[0] as SVGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async stopLayout() {
    if (await this.pauseLayoutButton.isVisible()) {
      await this.pauseLayoutButton.click();
    }
  }

  async startLayout() {
    if (await this.resumeLayoutButton.isVisible()) {
      await this.resumeLayoutButton.click();
    }
  }

  /**
   * Reduce the workspace to exactly the requested nodes.
   *
   * Deselecting a node removes its `<SelectedNodeItem>`, so snapshot labels
   * first; click each non-keep node via its own `graph-selected-<label>`
   * selector to avoid stale list-index handles.
   */
  async isolateNodes(labels: string[]) {
    await this.selectNodes(labels);
    await this.invertSelectionButton.click();
    await this.removeSelectionButton.click();
  }

  async isolateEdge(from: string, to: string) {
    await this.isolateNodes([from, to]);
  }
}
